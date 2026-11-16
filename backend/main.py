import os
import re
import sys
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Ensure root directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.config import UPLOAD_DIR, GENERATED_DIR, SAMPLES_DIR, settings
from backend.database import (
    init_db, create_project, get_projects, get_project,
    delete_project, toggle_favorite, save_setting, get_setting
)
from backend.services.image_processor import ImageProcessor
from backend.services.prompt_builder import (
    PromptBuilder, ARCHITECTURAL_STYLES, BUILDING_TYPES, LIGHTING_CONDITIONS, DEFAULT_NEGATIVE_PROMPT,
    profile_for_provider
)
from backend.services.generator import ArchitecturalGenerator
from backend.services.comfyui_client import ComfyUIClient
from backend.services.gallery_data import init_sample_assets, EXAMPLES
from backend.services.cache import global_cache

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("campusvision.main")

# Public URL prefix -> folder, used to turn URLs into safe file paths and back
_PUBLIC_DIRS = [
    ("/uploads", UPLOAD_DIR),
    ("/samples", SAMPLES_DIR),
    ("/generated", GENERATED_DIR),
]


def resolve_public_file(url: str) -> Optional[Path]:
    """Maps a public URL (e.g. /uploads/x_sketch.png or the legacy /backend/uploads/...) to a file,
    only if it really lives inside uploads/samples/generated. Blocks '..' tricks."""
    if not url:
        return None
    clean = "/" + url.split("?", 1)[0].lstrip("/")
    if clean.startswith("/backend/"):
        clean = clean[len("/backend"):]
    for prefix, folder in _PUBLIC_DIRS:
        if clean.startswith(prefix + "/"):
            candidate = (folder / clean[len(prefix) + 1:]).resolve()
            try:
                candidate.relative_to(folder.resolve())
            except ValueError:
                return None
            return candidate if candidate.is_file() else None
    return None


def to_public_url(path: str) -> str:
    """Turns a file path inside uploads/samples/generated into the URL the server really serves."""
    resolved = Path(path).resolve()
    for prefix, folder in _PUBLIC_DIRS:
        try:
            return f"{prefix}/{resolved.relative_to(folder.resolve()).as_posix()}"
        except ValueError:
            continue
    return "/" + resolved.relative_to(BASE_DIR).as_posix()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=settings.description
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database and sample assets on startup.
# init_db() is idempotent and also runs at import time, so tools that build the app without
# running startup events (e.g. a bare TestClient) still get their tables.
init_db()

@app.on_event("startup")
def on_startup():
    logger.info("Initializing CampusVision AI database...")
    init_db()
    logger.info("Initializing curated architectural sample showcase assets...")
    init_sample_assets()
    logger.info("CampusVision AI Backend ready.")

# Static files mounts
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/generated", StaticFiles(directory=str(GENERATED_DIR)), name="generated")
app.mount("/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="samples")
# History records store sketch/edge URLs as "/backend/uploads/..." - serve those paths too so downloads and comparison views work
app.mount("/backend/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="backend_uploads")
app.mount("/backend/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="backend_samples")
app.mount("/backend/generated", StaticFiles(directory=str(GENERATED_DIR)), name="backend_generated")

# ----------------- Models -----------------
class BuildPromptRequest(BaseModel):
    user_prompt: str = ""
    style: str = "Modern Minimalist"
    building_type: str = "University Building"
    lighting: str = "Morning"
    materials: str = "Structural glass, fair-faced concrete, timber accents"
    provider: Optional[str] = None   # engine the prompt is written for (defaults to the saved engine)

class PreprocessUrlRequest(BaseModel):
    sketch_url: str

class GenerateRequest(BaseModel):
    sketch_id: Optional[str] = None
    sketch_url: Optional[str] = None
    user_prompt: str = ""
    style: str = "Modern Minimalist"
    building_type: str = "University Building"
    lighting: str = "Morning"
    materials: str = "Structural glass curtain walls, fair-faced concrete, timber accents"
    controlnet_strength: float = Field(0.80, ge=0.1, le=1.0)
    denoising_strength: float = Field(0.75, ge=0.1, le=1.0)
    guidance_scale: float = Field(7.5, ge=1.0, le=20.0)
    seed: int = -1
    resolution: str = "1024x768"
    negative_prompt: Optional[str] = None
    compiled_prompt: Optional[str] = None   # manual prompt override from the Studio
    provider: Optional[str] = None
    title: Optional[str] = None

class ConfigUpdateRequest(BaseModel):
    huggingface_api_key: Optional[str] = None
    replicate_api_token: Optional[str] = None
    fal_key: Optional[str] = None
    default_provider: Optional[str] = None

class TestProviderRequest(BaseModel):
    provider: str
    api_key: str

# ----------------- API Endpoints -----------------
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "db_initialized": True
    }

@app.get("/api/config")
def get_config():
    settings.reload()
    hf_key = get_setting("HUGGINGFACE_API_KEY") or settings.huggingface_api_key or os.getenv("HUGGINGFACE_API_KEY", "")
    replicate_token = get_setting("REPLICATE_API_TOKEN") or settings.replicate_api_token or os.getenv("REPLICATE_API_TOKEN", "")
    fal_key = get_setting("FAL_KEY") or settings.fal_key or os.getenv("FAL_KEY", "")
    provider = get_setting("DEFAULT_PROVIDER") or settings.default_provider

    has_replicate = bool(replicate_token and not replicate_token.strip().startswith("demo"))
    has_hf = bool(hf_key and not hf_key.strip().startswith("demo"))
    has_fal = bool(fal_key and not fal_key.strip().startswith("demo"))
    has_live_key = has_replicate or has_hf or has_fal

    if provider == "demo":
        active_label = "Demo Simulation Mode (Offline Procedural)"
        is_demo = True
    elif provider in ("comfyui", "local"):
        active_label = "Local ComfyUI (SD 1.5 + ControlNet Canny)"
        is_demo = False
    elif has_replicate:
        active_label = f"Replicate SDXL ControlNet ({settings.replicate_model})"
        is_demo = False
    elif has_hf:
        active_label = "Hugging Face Inference API"
        is_demo = False
    elif has_fal:
        active_label = "Fal.ai Fast SDXL"
        is_demo = False
    else:
        active_label = "Demo Simulation Mode (Configure API Token in Settings for Cloud GPU)"
        is_demo = True

    return {
        "default_provider": provider,
        "has_huggingface_key": has_hf,
        "has_replicate_token": has_replicate,
        "has_fal_key": has_fal,
        "is_demo_mode": is_demo,
        "active_provider_label": active_label,
        "prompt_profile": profile_for_provider("replicate" if (provider == "auto" and has_replicate) else provider),
        "primary_model": settings.replicate_model,
        "primary_version": settings.replicate_version,
        "styles": list(ARCHITECTURAL_STYLES.keys()),
        "building_types": list(BUILDING_TYPES.keys()),
        "lighting_options": list(LIGHTING_CONDITIONS.keys()),
        "default_negative_prompt": DEFAULT_NEGATIVE_PROMPT
    }

@app.post("/api/config")
def update_config(req: ConfigUpdateRequest):
    if req.huggingface_api_key is not None:
        save_setting("HUGGINGFACE_API_KEY", req.huggingface_api_key.strip())
    if req.replicate_api_token is not None:
        save_setting("REPLICATE_API_TOKEN", req.replicate_api_token.strip())
    if req.fal_key is not None:
        save_setting("FAL_KEY", req.fal_key.strip())
    if req.default_provider is not None:
        save_setting("DEFAULT_PROVIDER", req.default_provider.strip())

    return {"status": "success", "message": "Settings updated successfully."}

@app.get("/api/comfyui/status")
async def comfyui_status():
    return await ComfyUIClient.check_status()

@app.post("/api/test-provider")
async def test_provider_endpoint(req: TestProviderRequest):
    return await ArchitecturalGenerator.test_provider_credentials(req.provider, req.api_key)

def _active_provider_name() -> str:
    settings.reload()
    return (get_setting("DEFAULT_PROVIDER") or settings.default_provider or "comfyui").lower().strip()

@app.post("/api/build-prompt")
def build_prompt_endpoint(req: BuildPromptRequest):
    provider = (req.provider or _active_provider_name()).lower().strip()
    if provider == "auto":
        provider = "replicate" if (get_setting("REPLICATE_API_TOKEN") or settings.replicate_api_token) else (
            "huggingface" if (get_setting("HUGGINGFACE_API_KEY") or settings.huggingface_api_key) else "comfyui")
    return PromptBuilder.build_prompt(
        user_prompt=req.user_prompt,
        style=req.style,
        building_type=req.building_type,
        lighting=req.lighting,
        materials=req.materials,
        profile=profile_for_provider(provider)
    )

@app.post("/api/preprocess-url")
def preprocess_url_endpoint(req: PreprocessUrlRequest):
    """Runs the OpenCV edge pipeline on a bundled/uploaded sketch (e.g. a preloaded sample) so the
    Studio gets a real edge map, blueprint and valid sketch_id instead of guessed URLs."""
    path = resolve_public_file(req.sketch_url)
    if not path:
        raise HTTPException(status_code=404, detail="Sketch not found on the server.")
    stem = re.sub(r"[^A-Za-z0-9_-]", "_", path.stem)
    res = ImageProcessor.process_sketch(str(path), f"sample_{stem}")
    return {
        "status": "success",
        "sketch_id": f"sample_{stem}",
        "filename": path.name,
        "sketch_url": to_public_url(str(path)),
        "edge_url": res["edge_url"],
        "blueprint_url": res["blueprint_url"],
        "width": res["width"],
        "height": res["height"],
        "aspect_ratio": res.get("aspect_ratio"),
        "aspect_label": res.get("aspect_label"),
        "edge_density": res["edge_density"],
        "cache_hit": res.get("cache_hit", False),
    }

@app.post("/api/preprocess-sketch")
async def preprocess_sketch_endpoint(file: UploadFile = File(...)):
    """
    Uploads raw architectural sketch, performs OpenCV grayscale, bilateral filtering,
    Canny edge detection and blueprint visualization map.
    """
    try:
        content = await file.read()
        res = ImageProcessor.validate_and_save(content, file.filename or "sketch.png")
        return {
            "status": "success",
            **res
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Sketch preprocessing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.post("/api/generate")
async def generate_render_endpoint(req: GenerateRequest):
    """
    Generates a photorealistic campus architectural render from the sketch
    using structural conditioning and generative AI.
    """
    # 1. Resolve sketch path and edge path
    sketch_path = None
    edge_path = None

    if req.sketch_id and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", req.sketch_id):
        # Check in uploads
        for f in UPLOAD_DIR.glob(f"{req.sketch_id}_sketch*"):
            sketch_path = str(f)
            break
        edge_candidate = UPLOAD_DIR / f"{req.sketch_id}_edge.png"
        if edge_candidate.exists():
            edge_path = str(edge_candidate)

    # If user provided a sketch_url (e.g. from examples or existing upload)
    if not sketch_path and req.sketch_url:
        candidate = resolve_public_file(req.sketch_url)
        if candidate:
            sketch_path = str(candidate)
            # Use the matching edge map if it exists, otherwise it is generated below
            edge_cand = candidate.parent / candidate.name.replace("_sketch", "_edge")
            if edge_cand.exists() and edge_cand != candidate:
                edge_path = str(edge_cand)

    if not sketch_path or not Path(sketch_path).exists():
        if req.sketch_id or req.sketch_url:
            # The user picked a specific sketch - do not silently render a different one
            raise HTTPException(
                status_code=400,
                detail="The selected sketch could not be found on the server. Please upload it again."
            )
        # Nothing selected at all: fall back to the bundled sample sketch
        default_sketch = SAMPLES_DIR / "sketches" / "academic_block_sketch.png"
        if default_sketch.exists():
            sketch_path = str(default_sketch)
            edge_res = ImageProcessor.process_sketch(sketch_path, "sample_default")
            edge_path = edge_res["edge_path"]
        else:
            raise HTTPException(status_code=400, detail="Architectural sketch not found. Please upload a sketch first.")

    if not edge_path or not Path(edge_path).exists():
        edge_res = ImageProcessor.process_sketch(sketch_path, f"auto_{Path(sketch_path).stem}")
        edge_path = edge_res["edge_path"]

    # 2. Run generative AI pipeline
    gen_result = await ArchitecturalGenerator.generate_render(
        sketch_path=sketch_path,
        edge_path=edge_path,
        user_prompt=req.user_prompt,
        style=req.style,
        building_type=req.building_type,
        lighting=req.lighting,
        materials=req.materials,
        controlnet_strength=req.controlnet_strength,
        denoising_strength=req.denoising_strength,
        guidance_scale=req.guidance_scale,
        seed=req.seed,
        resolution=req.resolution,
        negative_prompt_override=req.negative_prompt,
        provider_override=req.provider,
        compiled_prompt_override=req.compiled_prompt
    )

    # 3. Determine public sketch & edge URLs
    rel_sketch = to_public_url(sketch_path)
    rel_edge = to_public_url(edge_path)

    # 4. Save to project history database
    title = req.title or f"{req.building_type} ({req.style})"
    project_record = create_project({
        "title": title,
        "sketch_url": rel_sketch,
        "edge_url": rel_edge,
        "render_url": gen_result["render_url"],
        "style": req.style,
        "building_type": req.building_type,
        "lighting": req.lighting,
        "materials": req.materials,
        "user_prompt": req.user_prompt,
        "compiled_prompt": gen_result["compiled_prompt"],
        "negative_prompt": gen_result["negative_prompt"],
        "controlnet_strength": req.controlnet_strength,
        "denoising_strength": req.denoising_strength,
        "guidance_scale": req.guidance_scale,
        "seed": gen_result["seed"],
        "resolution": gen_result.get("resolution", req.resolution),
        "inference_time_sec": gen_result["inference_time_sec"],
        "provider": gen_result["provider"],
        "is_demo_mode": gen_result["is_demo_mode"],
        "model_name": gen_result.get("model_name", "Unknown model"),
        "model_version": gen_result.get("model_version", settings.replicate_version),
        "cache_hit": gen_result.get("cache_hit", False),
        "aspect_ratio": gen_result.get("aspect_ratio", "4:3")
    })

    return {
        "status": "success",
        "project": project_record,
        "generation": gen_result
    }

@app.get("/api/cache-stats")
def get_cache_stats():
    """Returns deterministic preprocessor & generation cache metrics."""
    return global_cache.get_stats()

@app.post("/api/cache/clear")
def clear_cache():
    """Clears the preprocessing and generation cache."""
    global_cache.clear()
    return {"status": "success", "message": "Cache successfully cleared."}

@app.get("/api/examples")
def get_examples():
    """Returns curated architectural example case studies with sketch and photoreal render URLs."""
    result = []
    for ex in EXAMPLES:
        result.append({
            **ex,
            "sketch_url": f"/samples/sketches/{ex['sketch_file']}",
            "render_url": f"/samples/renders/{ex['render_file']}"
        })
    return result

@app.get("/api/projects")
def list_projects(
    search: Optional[str] = Query(None),
    building_type: Optional[str] = Query(None),
    style: Optional[str] = Query(None),
    favorites_only: bool = Query(False)
):
    """Retrieves all generated campus architecture projects with optional filtering."""
    return get_projects(search=search, building_type=building_type, style=style, favorites_only=favorites_only)

@app.get("/api/projects/{project_id}")
def get_single_project(project_id: str):
    proj = get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@app.delete("/api/projects/{project_id}")
def delete_single_project(project_id: str):
    success = delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success", "message": "Project deleted"}

@app.post("/api/projects/{project_id}/favorite")
def toggle_project_favorite(project_id: str):
    res = toggle_favorite(project_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "success", "is_favorite": res}

# Mount built frontend single-page application if available
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend_spa(full_path: str):
        if full_path.split("/", 1)[0] in ("api", "uploads", "generated", "samples", "backend"):
            raise HTTPException(status_code=404, detail="Not found")
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")