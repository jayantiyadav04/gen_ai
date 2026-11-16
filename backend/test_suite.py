import sys
import os
import json
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.main import app

def run_all_tests():
    print("==================================================")
    print("  CAMPUSVISION AI — VERIFICATION TEST SUITE")
    print("==================================================")
    
    client = TestClient(app)
    
    # 1. Health check
    print("\n[1/9] Testing GET /api/health ...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"  ✓ Status: 200 OK -> {res.json()}")
    
    # 2. Config check
    print("\n[2/9] Testing GET /api/config ...")
    res = client.get("/api/config")
    assert res.status_code == 200, f"Config check failed: {res.text}"
    cfg = res.json()
    assert "styles" in cfg and "building_types" in cfg
    print(f"  ✓ Active Provider: {cfg['active_provider_label']}")
    print(f"  ✓ Styles available: {len(cfg['styles'])}, Typologies: {len(cfg['building_types'])}")
    
    # 3. Examples check
    print("\n[3/9] Testing GET /api/examples ...")
    res = client.get("/api/examples")
    assert res.status_code == 200
    examples = res.json()
    assert len(examples) >= 6, f"Expected 6 sample cases, got {len(examples)}"
    print(f"  ✓ Loaded {len(examples)} architectural case studies:")
    for ex in examples:
        print(f"    • {ex['title']} ({ex['category']} / {ex['style']})")
        assert Path("backend" + ex['sketch_url']).exists()
        assert Path("backend" + ex['render_url']).exists()
    print("  ✓ All example sketches and photoreal renders verified on disk.")
    
    # 4. Prompt compiler check
    print("\n[4/9] Testing POST /api/build-prompt ...")
    prompt_payload = {
        "user_prompt": "Glass curtain wall with landscaped courtyard and morning sun",
        "style": "Modern Minimalist",
        "building_type": "University Building",
        "lighting": "Morning",
        "materials": "Low-iron structural glass, fair-faced concrete"
    }
    res = client.post("/api/build-prompt", json=prompt_payload)
    assert res.status_code == 200
    built = res.json()
    assert "compiled_prompt" in built and "negative_prompt" in built
    print(f"  ✓ Compiled prompt: {built['compiled_prompt'][:80]}...")
    print(f"  ✓ Negative prompt: {built['negative_prompt'][:60]}...")
    
    # 5. Sketch Preprocessing check with OpenCV
    print("\n[5/9] Testing POST /api/preprocess-sketch with OpenCV Canny edge extraction...")
    # Use one of the generated sketches as test input
    sample_sketch_path = Path("backend/samples/sketches/academic_block_sketch.png")
    with open(sample_sketch_path, "rb") as f:
        file_bytes = f.read()
    
    files = {"file": ("test_elevation_sketch.png", file_bytes, "image/png")}
    res = client.post("/api/preprocess-sketch", files=files)
    assert res.status_code == 200, f"Preprocessing failed: {res.text}"
    proc = res.json()
    assert proc["status"] == "success"
    assert "sketch_url" in proc and "edge_url" in proc and "blueprint_url" in proc
    print(f"  ✓ OpenCV processing succeeded:")
    print(f"    • Sketch: {proc['sketch_url']}")
    print(f"    • ControlNet Edge Map: {proc['edge_url']}")
    print(f"    • Blueprint Overlay: {proc['blueprint_url']}")
    print(f"    • Dimensions: {proc['width']}x{proc['height']}, Edge density: {proc['edge_density']}")
    
    # 6. Core Image-to-Image Generation endpoint
    print("\n[6/9] Testing POST /api/generate (Verify honest error handling & explicit demo mode)...")
    # 6a. Verify honest error trapping when unauthenticated (No silent fallback)
    unauth_payload = {
        "sketch_id": proc["sketch_id"],
        "user_prompt": "Modern university academic block",
        "provider": "replicate"
    }
    unauth_res = client.post("/api/generate", json=unauth_payload)
    assert unauth_res.status_code in [400, 401], f"Expected 400/401, got {unauth_res.status_code}"
    print(f"  ✓ Honest error reporting confirmed (HTTP {unauth_res.status_code}): No silent fallback.")

    # 6b. Explicit demo mode test
    gen_payload = {
        "sketch_id": proc["sketch_id"],
        "user_prompt": "Modern university academic block with fair-faced concrete and morning sunlight",
        "style": "Modern Minimalist",
        "building_type": "University Building",
        "lighting": "Morning",
        "materials": "Structural glass, white concrete",
        "controlnet_strength": 0.85,
        "denoising_strength": 0.70,
        "guidance_scale": 7.5,
        "seed": 42,
        "resolution": "1024x768",
        "provider": "demo",
        "title": "Test Academic Block Render"
    }
    t0 = time.time()
    res = client.post("/api/generate", json=gen_payload)
    assert res.status_code == 200, f"Generation failed: {res.text}"
    gen_data = res.json()
    assert gen_data["status"] == "success"
    proj = gen_data["project"]
    assert "render_url" in proj
    assert Path("backend" + proj["render_url"]).exists()
    print(f"  ✓ Image generated in {time.time() - t0:.2f}s:")
    print(f"    • Render URL: {proj['render_url']}")
    print(f"    • Active Provider: {proj['provider']}")
    print(f"    • Is Demo Mode: {proj['is_demo_mode']}")
    print(f"    • ControlNet Strength: {proj['controlnet_strength']}")
    
    # 7. Database persistence check
    print("\n[7/9] Testing GET /api/projects (SQLite persistence)...")
    res = client.get("/api/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) >= 1
    found = any(p["id"] == proj["id"] for p in projects)
    assert found, "Generated project not found in database!"
    print(f"  ✓ Found {len(projects)} projects persisted in SQLite database.")
    
    # 8. Favorite toggle check
    print(f"\n[8/9] Testing POST /api/projects/{proj['id']}/favorite ...")
    res = client.post(f"/api/projects/{proj['id']}/favorite")
    assert res.status_code == 200
    assert res.json()["is_favorite"] is True
    print("  ✓ Favorite status successfully toggled to True.")
    
    # 9. Frontend SPA serving check
    print("\n[9/9] Testing GET / (Frontend Single-Page Application)...")
    res = client.get("/")
    assert res.status_code == 200
    assert "CampusVision AI" in res.text
    print("  ✓ Frontend HTML and bundled assets served successfully from FastAPI!")
    
    print("\n==================================================")
    print("  ALL 9 VERIFICATION TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()

