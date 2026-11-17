"""Regression tests for: per-model prompts, preloaded-sample flow, style-specific negatives.
Run:  ./venv/bin/python backend/test_prompts_and_samples.py
"""
import sys
from pathlib import Path
from io import BytesIO
from tempfile import TemporaryDirectory
from unittest.mock import patch
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings

client = TestClient(app)


def build(provider, **kw):
    body = {"user_prompt": "glass atrium and landscaped courtyard", "style": "Neo-Classical",
            "building_type": "Library", "lighting": "Golden Hour", "materials": "", "provider": provider}
    body.update(kw)
    r = client.post("/api/build-prompt", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_prompts_differ_per_model():
    sd15, sdxl, img2img = build("comfyui"), build("replicate"), build("fal")
    assert sd15["prompt_profile"] == "sd15" and sdxl["prompt_profile"] == "sdxl" and img2img["prompt_profile"] == "sdxl_img2img"
    assert len({sd15["compiled_prompt"], sdxl["compiled_prompt"], img2img["compiled_prompt"]}) == 3
    assert len(sd15["compiled_prompt"].split()) <= 60, "SD1.5 prompt must stay inside CLIP's ~75 token window"
    assert "photograph" in sdxl["compiled_prompt"].lower()
    assert "8k" not in sdxl["compiled_prompt"].lower()
    assert "line art" in img2img["negative_prompt"], "img2img must push away from the drawing"
    print("  ok per-model prompts")


def test_negative_prompt_matches_style():
    neo = build("comfyui", style="Neo-Classical")["negative_prompt"]
    mod = build("comfyui", style="Modern Minimalist")["negative_prompt"]
    assert "classical columns" not in neo, "Neo-Classical must not forbid classical columns"
    assert "classical columns" in mod
    print("  ok style-specific negative prompt")


def test_instruction_wording_removed():
    r = build("comfyui", user_prompt="Convert rough elevation sketch into a modern academic block with glass")
    assert "convert" not in r["compiled_prompt"].lower() and "sketch" not in r["compiled_prompt"].lower()
    print("  ok instruction wording stripped")


def test_every_example_is_selectable_and_processable():
    examples = client.get("/api/examples").json()
    assert len(examples) >= 6
    seen_prompts = set()
    for ex in examples:
        r = client.post("/api/preprocess-url", json={"sketch_url": ex["sketch_url"]})
        assert r.status_code == 200, r.text
        pre = r.json()
        assert pre["edge_url"].startswith("/uploads/") and Path("backend" + pre["edge_url"]).exists()
        p = build("comfyui", user_prompt=ex["user_prompt"], style=ex["style"], building_type=ex["category"],
                  lighting=ex["lighting"], materials=ex["materials"])
        seen_prompts.add(p["compiled_prompt"])
    assert len(seen_prompts) == len(examples), "each preloaded sketch must produce its own prompt"
    print(f"  ok {len(examples)} examples -> {len(seen_prompts)} distinct prompts")


def test_generate_demo_with_sample():
    ex = client.get("/api/examples").json()[2]
    pre = client.post("/api/preprocess-url", json={"sketch_url": ex["sketch_url"]}).json()
    r = client.post("/api/generate", json={
        "sketch_id": pre["sketch_id"], "sketch_url": pre["sketch_url"], "user_prompt": ex["user_prompt"],
        "style": ex["style"], "building_type": ex["category"], "lighting": ex["lighting"],
        "materials": ex["materials"], "provider": "demo", "seed": 98765})
    assert r.status_code == 200, r.text
    g = r.json()["generation"]
    assert g["prompt_profile"] == "demo" and ex["style"] == g["style"]
    project = r.json()["project"]
    assert isinstance(project["is_demo_mode"], bool)
    assert isinstance(project["is_favorite"], bool)
    assert isinstance(project["cache_hit"], bool)
    assert g["seed"] == project["seed"] == -1
    sample_path = Path("backend/samples/sketches") / ex["sketch_file"]
    with Image.open(sample_path) as sample_image:
        expected_size = f"{sample_image.width}x{sample_image.height}"
    assert g["resolution"] == expected_size
    print("  ok generate with preloaded sample (demo engine)")


def test_auto_provider_preview_uses_fal_profile():
    from backend.main import get_config

    def fake_setting(key, default=None):
        if key == "DEFAULT_PROVIDER":
            return "auto"
        if key == "FAL_KEY":
            return "fal_test_key"
        return default

    with patch("backend.main.get_setting", side_effect=fake_setting):
        preview = client.post("/api/build-prompt", json={
            "user_prompt": "stone campus building", "provider": "auto"
        })
        assert preview.status_code == 200, preview.text
        assert preview.json()["prompt_profile"] == "sdxl_img2img"
        config = get_config()
        assert config["default_provider"] == "auto"
        assert config["prompt_profile"] == "sdxl_img2img"
        assert config["is_demo_mode"] is False
        assert "Fal.ai" in config["active_provider_label"]
    print("  ok auto provider prompt/profile agrees for Fal.ai")


def test_auto_provider_priority_and_unknown_provider_validation():
    from backend.services.provider_resolver import resolve_provider

    assert resolve_provider("auto", True, True, True) == "replicate"
    assert resolve_provider("auto", False, True, True) == "huggingface"
    assert resolve_provider("auto", False, False, True) == "fal"
    assert resolve_provider("auto") == "comfyui"
    r = client.post("/api/config", json={"default_provider": "not-a-provider"})
    assert r.status_code == 422, r.text
    print("  ok auto provider priority and settings validation")


def test_manual_prompt_override_is_used():
    ex = client.get("/api/examples").json()[0]
    r = client.post("/api/generate", json={"sketch_url": ex["sketch_url"], "provider": "demo",
                                           "compiled_prompt": "MY CUSTOM PROMPT"})
    assert r.json()["generation"]["compiled_prompt"] == "MY CUSTOM PROMPT"
    print("  ok manual prompt override reaches the backend")


def test_missing_sketch_is_not_silently_replaced():
    r = client.post("/api/generate", json={"sketch_url": "/samples/sketches/nope.png", "provider": "demo"})
    assert r.status_code == 400
    r = client.post("/api/generate", json={"sketch_id": "*", "provider": "demo"})
    assert r.status_code == 400  # invalid IDs must not select another uploaded file
    print("  ok bad sketch / glob id handled")


def test_spa_catchall_blocks_encoded_traversal():
    r = client.get("/..%2f..%2fREADME.md")
    assert r.status_code == 404, f"Traversal request unexpectedly returned {r.status_code}"
    print("  ok SPA catch-all rejects encoded traversal")


def test_cors_rejects_untrusted_origin():
    r = client.get("/api/health", headers={"Origin": "https://attacker.example"})
    assert "access-control-allow-origin" not in r.headers
    print("  ok CORS rejects untrusted origin")


def test_upload_body_limit_is_enforced_before_full_read():
    original_limit = settings.max_upload_size_mb
    try:
        settings.max_upload_size_mb = 0
        r = client.post("/api/preprocess-sketch", files={"file": ("small.png", b"x", "image/png")})
        assert r.status_code == 413, r.text
    finally:
        settings.max_upload_size_mb = original_limit
    print("  ok upload size limit returns 413")


def test_image_upload_normalizes_transparency_exif_and_pixel_limit():
    from backend.services import image_processor
    from backend.services.cache import CampusVisionCache

    with TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)
        upload_dir = root / "uploads"
        upload_dir.mkdir()
        with patch.object(image_processor, "UPLOAD_DIR", upload_dir), \
             patch.object(image_processor, "global_cache", CampusVisionCache(root / "cache")):
            rgba = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            ImageDraw.Draw(rgba).line((4, 4, 28, 28), fill=(0, 0, 0, 255), width=2)
            rgba_bytes = BytesIO()
            rgba.save(rgba_bytes, format="PNG")
            rgba_result = image_processor.ImageProcessor.validate_and_save(rgba_bytes.getvalue(), "alpha.png")
            saved_rgba = Image.open(upload_dir / rgba_result["filename"])
            assert saved_rgba.mode == "RGB" and saved_rgba.getpixel((0, 0)) == (255, 255, 255)

            rotated = Image.new("RGB", (32, 16), "white")
            exif = Image.Exif()
            exif[274] = 6
            jpeg_bytes = BytesIO()
            rotated.save(jpeg_bytes, format="JPEG", exif=exif)
            jpeg_result = image_processor.ImageProcessor.validate_and_save(jpeg_bytes.getvalue(), "phone.jpg")
            saved_jpeg = Image.open(upload_dir / jpeg_result["filename"])
            assert saved_jpeg.size == (16, 32), saved_jpeg.size

            image_processor.MAX_IMAGE_PIXELS = 100
            try:
                too_large = Image.new("RGB", (11, 10), "white")
                too_large_bytes = BytesIO()
                too_large.save(too_large_bytes, format="PNG")
                try:
                    image_processor.ImageProcessor.validate_and_save(too_large_bytes.getvalue(), "large.png")
                except ValueError as exc:
                    assert "pixels" in str(exc)
                else:
                    raise AssertionError("Image above the pixel limit was accepted")
            finally:
                image_processor.MAX_IMAGE_PIXELS = 25_000_000
    print("  ok alpha, EXIF orientation, and pixel limit normalization")


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            print(name)
            fn()
    print("ALL PASSED")
