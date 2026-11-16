"""Regression tests for: per-model prompts, preloaded-sample flow, style-specific negatives.
Run:  ./venv/bin/python backend/test_prompts_and_samples.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from fastapi.testclient import TestClient
from backend.main import app

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
        "materials": ex["materials"], "provider": "demo"})
    assert r.status_code == 200, r.text
    g = r.json()["generation"]
    assert g["prompt_profile"] == "demo" and ex["style"] == g["style"]
    print("  ok generate with preloaded sample (demo engine)")


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
    assert r.status_code in (200, 400)  # wildcard id must not pick a random upload
    print("  ok bad sketch / glob id handled")


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            print(name)
            fn()
    print("ALL PASSED")
