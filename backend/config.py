import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
UPLOAD_DIR = BASE_DIR / "uploads"
GENERATED_DIR = BASE_DIR / "generated"
SAMPLES_DIR = BASE_DIR / "samples"
DB_PATH = BASE_DIR / "campusvision.db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
(SAMPLES_DIR / "sketches").mkdir(parents=True, exist_ok=True)
(SAMPLES_DIR / "renders").mkdir(parents=True, exist_ok=True)

def load_env_file(override=False):
    """Lightweight zero-dependency .env parser that loads variables into os.environ."""
    env_paths = [
        PROJECT_ROOT / ".env",
        BASE_DIR / ".env"
    ]
    for p in env_paths:
        if p.is_file():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'\"")
                            if key:
                                if override or key not in os.environ:
                                    os.environ[key] = val
            except Exception:
                pass

load_env_file()

class Settings(BaseModel):
    app_name: str = "CampusVision AI"
    version: str = "2.0.0"
    description: str = "Sketch-to-Photoreal Campus Architectural Renderer"
    
    # API Keys (loaded from environment, .env file, or updated via settings endpoint)
    huggingface_api_key: str = os.getenv("HUGGINGFACE_API_KEY", "")
    replicate_api_token: str = os.getenv("REPLICATE_API_TOKEN", "")
    fal_key: str = os.getenv("FAL_KEY", "")
    
    # Provider selection: 'replicate' | 'huggingface' | 'fal' | 'demo' | 'auto'
    default_provider: str = os.getenv("DEFAULT_PROVIDER") or os.getenv("AI_PROVIDER") or "replicate"
    
    # Primary Replicate Model specification (SDXL ControlNet Canny)
    replicate_model: str = "lucataco/sdxl-controlnet"
    replicate_version: str = "06d6fae3b75ab68a28cd2900afa6033166910dd09fd9751047043a5bbb4c184b"
    replicate_poll_timeout: int = int(os.getenv("REPLICATE_POLL_TIMEOUT", "120"))
    
    # Local ComfyUI provider (free, runs on this machine)
    comfyui_url: str = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188")
    comfyui_checkpoint: str = os.getenv("COMFYUI_CHECKPOINT", "v1-5-pruned-emaonly.safetensors")
    comfyui_controlnet: str = os.getenv("COMFYUI_CONTROLNET", "control_v11p_sd15_canny_fp16.safetensors")
    comfyui_timeout: int = int(os.getenv("COMFYUI_TIMEOUT", "900"))

    # Allowed image formats & max size
    allowed_extensions: list[str] = [".png", ".jpg", ".jpeg", ".webp"]
    max_upload_size_mb: int = 20

    def reload(self):
        load_env_file(override=True)
        self.huggingface_api_key = os.getenv("HUGGINGFACE_API_KEY", "")
        self.replicate_api_token = os.getenv("REPLICATE_API_TOKEN", "")
        self.fal_key = os.getenv("FAL_KEY", "")
        self.default_provider = os.getenv("DEFAULT_PROVIDER") or os.getenv("AI_PROVIDER") or "replicate"
        self.replicate_poll_timeout = int(os.getenv("REPLICATE_POLL_TIMEOUT", "120"))
        self.comfyui_url = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188")
        self.comfyui_checkpoint = os.getenv("COMFYUI_CHECKPOINT", "v1-5-pruned-emaonly.safetensors")
        self.comfyui_controlnet = os.getenv("COMFYUI_CONTROLNET", "control_v11p_sd15_canny_fp16.safetensors")
        self.comfyui_timeout = int(os.getenv("COMFYUI_TIMEOUT", "900"))

settings = Settings()
