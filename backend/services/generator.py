import os
import time
import uuid
import base64
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import httpx
from PIL import Image, ImageFilter
import cv2
import numpy as np

from backend.config import GENERATED_DIR, UPLOAD_DIR, settings
from backend.services.prompt_builder import PromptBuilder, ARCHITECTURAL_STYLES, LIGHTING_CONDITIONS
from backend.database import get_setting

logger = logging.getLogger("campusvision.generator")

class ArchitecturalGenerator:
    @staticmethod
    async def generate_render(
        sketch_path: str,
        edge_path: str,
        user_prompt: str,
        style: str = "Modern Minimalist",
        building_type: str = "University Building",
        lighting: str = "Morning",
        materials: str = "Structural glass, fair-faced concrete, timber accents",
        controlnet_strength: float = 0.80,
        denoising_strength: float = 0.75,
        guidance_scale: float = 7.5,
        seed: int = -1,
        resolution: str = "1024x768"
    ) -> Dict[str, Any]:
        """
        Executes the architectural image-to-image pipeline:
        1. Compiles intelligent architectural prompt
        2. Detects provider (Hugging Face / Replicate / Fal / Demo Mode)
        3. Generates the photorealistic campus visualization
        4. Saves and returns detailed generation metadata
        """
        start_time = time.time()
        
        # 1. Compile intelligent prompt
        prompt_data = PromptBuilder.build_prompt(
            user_prompt=user_prompt,
            style=style,
            building_type=building_type,
            lighting=lighting,
            materials=materials
        )
        compiled_prompt = prompt_data["compiled_prompt"]
        negative_prompt = prompt_data["negative_prompt"]
        
        # Check active provider & API keys
        hf_key = get_setting("HUGGINGFACE_API_KEY") or settings.huggingface_api_key or os.getenv("HUGGINGFACE_API_KEY", "")
        replicate_token = get_setting("REPLICATE_API_TOKEN") or settings.replicate_api_token or os.getenv("REPLICATE_API_TOKEN", "")
        preferred_provider = get_setting("DEFAULT_PROVIDER") or settings.default_provider
        
        gen_id = str(uuid.uuid4())[:8]
        render_filename = f"{gen_id}_render.png"
        render_path = GENERATED_DIR / render_filename
        
        is_demo_mode = True
        active_provider = "Demo Architectural Engine"
        status_message = ""
        
        # If user configured Hugging Face API
        if (preferred_provider in ["huggingface", "auto"]) and hf_key and not hf_key.startswith("demo"):
            try:
                logger.info("Attempting live generation with Hugging Face Inference API...")
                await ArchitecturalGenerator._generate_with_huggingface(
                    hf_key=hf_key,
                    edge_path=edge_path,
                    prompt=compiled_prompt,
                    negative_prompt=negative_prompt,
                    controlnet_strength=controlnet_strength,
                    guidance_scale=guidance_scale,
                    save_path=str(render_path)
                )
                is_demo_mode = False
                active_provider = "Hugging Face ControlNet SDXL (Live GPU)"
                status_message = "Render generated live using Hugging Face Cloud GPU."
            except Exception as e:
                logger.warning(f"Hugging Face generation failed: {e}. Falling back to demo simulation engine.")
                status_message = f"Live HF Cloud GPU unavailable ({str(e)}). Active: Demo Simulation Mode."
                ArchitecturalGenerator._generate_procedural_photoreal(
                    sketch_path=sketch_path,
                    edge_path=edge_path,
                    style=style,
                    building_type=building_type,
                    lighting=lighting,
                    user_prompt=user_prompt,
                    save_path=str(render_path)
                )
                
        # If user configured Replicate API
        elif (preferred_provider in ["replicate", "auto"]) and replicate_token and not replicate_token.startswith("demo"):
            try:
                logger.info("Attempting live generation with Replicate API...")
                await ArchitecturalGenerator._generate_with_replicate(
                    replicate_token=replicate_token,
                    edge_path=edge_path,
                    prompt=compiled_prompt,
                    negative_prompt=negative_prompt,
                    controlnet_strength=controlnet_strength,
                    guidance_scale=guidance_scale,
                    save_path=str(render_path)
                )
                is_demo_mode = False
                active_provider = "Replicate SDXL ControlNet (Live Cloud)"
                status_message = "Render generated live via Replicate Cloud API."
            except Exception as e:
                logger.warning(f"Replicate generation failed: {e}. Falling back to demo simulation engine.")
                status_message = f"Live Replicate Cloud unavailable ({str(e)}). Active: Demo Simulation Mode."
                ArchitecturalGenerator._generate_procedural_photoreal(
                    sketch_path=sketch_path,
                    edge_path=edge_path,
                    style=style,
                    building_type=building_type,
                    lighting=lighting,
                    user_prompt=user_prompt,
                    save_path=str(render_path)
                )
                
        else:
            # Demo Simulation Mode
            is_demo_mode = True
            active_provider = "Demo Simulation Mode (Add API Key in Settings for Live GPU)"
            status_message = (
                "Generated via procedural architectural synthesis engine. "
                "To run live image-to-image diffusion on cloud GPUs, add a free Hugging Face or Replicate API key in Settings."
            )
            ArchitecturalGenerator._generate_procedural_photoreal(
                sketch_path=sketch_path,
                edge_path=edge_path,
                style=style,
                building_type=building_type,
                lighting=lighting,
                user_prompt=user_prompt,
                save_path=str(render_path)
            )
            
        elapsed = round(time.time() - start_time, 2)
        
        return {
            "render_id": gen_id,
            "render_url": f"/generated/{render_filename}",
            "compiled_prompt": compiled_prompt,
            "negative_prompt": negative_prompt,
            "style": style,
            "building_type": building_type,
            "lighting": lighting,
            "materials": materials,
            "controlnet_strength": controlnet_strength,
            "denoising_strength": denoising_strength,
            "guidance_scale": guidance_scale,
            "seed": seed if seed != -1 else int(time.time() % 100000),
            "resolution": resolution,
            "inference_time_sec": elapsed,
            "provider": active_provider,
            "is_demo_mode": is_demo_mode,
            "status_message": status_message
        }

    @staticmethod
    async def _generate_with_huggingface(
        hf_key: str,
        edge_path: str,
        prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        save_path: str
    ):
        """Calls Hugging Face Inference API for ControlNet / SDXL image generation."""
        # Read edge image and encode to base64
        with open(edge_path, "rb") as f:
            edge_bytes = f.read()
            edge_b64 = base64.b64encode(edge_bytes).decode("utf-8")
            
        endpoint = "https://api-inference.huggingface.co/models/diffusers/controlnet-canny-sdxl-1.0"
        headers = {
            "Authorization": f"Bearer {hf_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": f"data:image/png;base64,{edge_b64}",
            "parameters": {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "controlnet_conditioning_scale": controlnet_strength,
                "guidance_scale": guidance_scale,
                "num_inference_steps": 30
            }
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            if resp.status_code != 200:
                raise ValueError(f"Hugging Face API returned status {resp.status_code}: {resp.text[:200]}")
            with open(save_path, "wb") as out_f:
                out_f.write(resp.content)

    @staticmethod
    async def _generate_with_replicate(
        replicate_token: str,
        edge_path: str,
        prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        save_path: str
    ):
        """Calls Replicate API for ControlNet generation."""
        with open(edge_path, "rb") as f:
            edge_b64 = base64.b64encode(f.read()).decode("utf-8")
        data_uri = f"data:image/png;base64,{edge_b64}"
        
        headers = {
            "Authorization": f"Token {replicate_token}",
            "Content-Type": "application/json"
        }
        
        # Create prediction
        create_url = "https://api.replicate.com/v1/predictions"
        payload = {
            "version": "da77bc59ee60423279fd632ef007f5f0f3d9e8c145fe82bd3d00f899e502a430",
            "input": {
                "image": data_uri,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "condition_scale": controlnet_strength,
                "guidance_scale": guidance_scale
            }
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(create_url, headers=headers, json=payload)
            if resp.status_code not in [200, 201]:
                raise ValueError(f"Replicate API error: {resp.text[:200]}")
            pred = resp.json()
            poll_url = pred["urls"]["get"]
            
            # Poll for completion
            for _ in range(30):
                await time.sleep(2)
                p_resp = await client.get(poll_url, headers=headers)
                p_data = p_resp.json()
                if p_data["status"] == "succeeded":
                    out_url = p_data["output"][0] if isinstance(p_data["output"], list) else p_data["output"]
                    img_resp = await client.get(out_url)
                    with open(save_path, "wb") as f_out:
                        f_out.write(img_resp.content)
                    return
                elif p_data["status"] == "failed":
                    raise ValueError(f"Replicate generation failed: {p_data.get('error')}")

    @staticmethod
    def _generate_procedural_photoreal(
        sketch_path: str,
        edge_path: str,
        style: str,
        building_type: str,
        lighting: str,
        user_prompt: str,
        save_path: str
    ):
        """
        Procedural photorealistic synthesis engine:
        Takes the user's REAL uploaded sketch, uses the actual OpenCV extracted edge map
        for structural geometry, applies architectural material shaders, lighting atmosphere,
        campus landscaping, and photorealistic tilt-shift optical styling.
        """
        # Load user's real sketch and real edge map
        sketch_bgr = cv2.imread(sketch_path)
        edge_gray = cv2.imread(edge_path, cv2.IMREAD_GRAYSCALE)
        
        if sketch_bgr is None:
            # Fallback if unreadable
            sketch_bgr = np.ones((768, 1024, 3), dtype=np.uint8) * 240
            edge_gray = np.zeros((768, 1024), dtype=np.uint8)
            
        h, w = sketch_bgr.shape[:2]
        if edge_gray.shape[:2] != (h, w):
            edge_gray = cv2.resize(edge_gray, (w, h))

        # 1. Sky & Atmospheric gradient
        sky_table = {
            "Morning": ((215, 235, 252), (242, 248, 255)),
            "Golden Hour": ((245, 175, 105), (255, 225, 185)),
            "Bright Daylight": ((135, 190, 245), (215, 238, 255)),
            "Sunset": ((175, 80, 110), (250, 160, 95)),
            "Evening": ((25, 45, 85), (55, 85, 135)),
            "Night": ((12, 18, 35), (20, 32, 60))
        }
        top_c, bot_c = sky_table.get(lighting, sky_table["Morning"])
        
        horizon_y = int(h * 0.72)
        canvas = np.zeros((h, w, 3), dtype=np.uint8)
        
        # Render sky
        for y in range(horizon_y):
            t = y / max(1, horizon_y)
            r = int(top_c[0] * (1 - t) + bot_c[0] * t)
            g = int(top_c[1] * (1 - t) + bot_c[1] * t)
            b = int(top_c[2] * (1 - t) + bot_c[2] * t)
            canvas[y, :] = (b, g, r) # BGR
            
        # Render campus ground (emerald lawns + paved stone terrace)
        lawn_bgr = (50, 120, 55) if lighting not in ["Evening", "Night"] else (20, 45, 30)
        plaza_bgr = (195, 195, 200) if lighting not in ["Evening", "Night"] else (65, 70, 80)
        
        for y in range(horizon_y, h):
            canvas[y, :] = lawn_bgr
            
        # Paved entrance promenade in foreground
        promenade = np.array([
            [int(w * 0.25), horizon_y],
            [int(w * 0.75), horizon_y],
            [int(w * 0.90), h],
            [int(w * 0.10), h]
        ], np.int32)
        cv2.fillPoly(canvas, [promenade], plaza_bgr)
        
        # Paving joint grid
        for py in range(horizon_y + 12, h, 28):
            cv2.line(canvas, (0, py), (w, py), (160, 160, 165), 1)

        # 2. Material mapping based on architectural style
        # Determine facade primary tone
        if style == "Modern Minimalist":
            facade_tone = (225, 225, 228) # Off-white architectural concrete
            glass_tone = (210, 180, 130) # Cool blue sky reflection
        elif style == "Sustainable / Green Architecture":
            facade_tone = (175, 190, 175) # Warm timber / biophilic green
            glass_tone = (195, 190, 140)
        elif style == "Futuristic Parametric":
            facade_tone = (195, 200, 210) # Brushed titanium
            glass_tone = (230, 210, 160)
        elif style == "Traditional Indian Heritage":
            facade_tone = (85, 110, 185) # Agra red sandstone
            glass_tone = (140, 170, 200)
        elif style == "Institutional Brutalist":
            facade_tone = (140, 145, 155) # Board-marked raw concrete
            glass_tone = (180, 165, 130)
        else: # Contemporary / Neo-Classical
            facade_tone = (215, 215, 215)
            glass_tone = (215, 185, 140)
            
        if lighting in ["Evening", "Night"]:
            glass_tone = (120, 210, 255) # Glowing interior incandescent warmth
            
        # 3. Structural Condition: Use the user's extracted edge map to synthesize building facade!
        # Invert edge map so lines are 0 and open areas are 255
        edge_mask = edge_gray > 40
        
        # Detect bounding envelope of building from user's edge map
        edge_pts = np.where(edge_gray > 40)
        if len(edge_pts[0]) > 50:
            min_y, max_y = np.min(edge_pts[0]), np.max(edge_pts[0])
            min_x, max_x = np.min(edge_pts[1]), np.max(edge_pts[1])
            # Extend ground connection
            max_y = max(max_y, horizon_y)
            
            # Fill building silhouette with facade material
            facade_roi = canvas[min_y:max_y, min_x:max_x]
            cv2.rectangle(canvas, (min_x, min_y), (max_x, max_y), facade_tone, -1)
            
            # Add horizontal floor plate stratification
            floors = 4
            floor_step = (max_y - min_y) // floors
            for fl in range(1, floors):
                fy = min_y + fl * floor_step
                cv2.line(canvas, (min_x, fy), (max_x, fy), (90, 95, 105), 3)
                
            # Window glazing bands
            for fl in range(floors):
                fy1 = min_y + fl * floor_step + 10
                fy2 = min_y + (fl + 1) * floor_step - 12
                if fy2 > fy1:
                    cv2.rectangle(canvas, (min_x + 15, fy1), (max_x - 15, fy2), glass_tone, -1)
                    # Window frames
                    cv2.rectangle(canvas, (min_x + 15, fy1), (max_x - 15, fy2), (50, 55, 65), 2)
                    # Vertical mullions every 50 px
                    for mx in range(min_x + 65, max_x - 15, 50):
                        cv2.line(canvas, (mx, fy1), (mx, fy2), (50, 55, 65), 1)
                        # Glass specular reflection highlight
                        cv2.line(canvas, (mx - 30, fy1 + 5), (mx - 10, fy2 - 5), (255, 255, 255), 2)
        else:
            # Default architectural massing if sketch was empty
            cv2.rectangle(canvas, (int(w * 0.15), int(h * 0.3)), (int(w * 0.85), horizon_y), facade_tone, -1)

        # 4. Integrate precise structural edge contours from the sketch
        # Blend the user's sketch line geometry as crisp structural reveals and architectural seams
        dilated_edge = cv2.dilate(edge_gray, np.ones((2, 2), np.uint8), iterations=1)
        edge_indices = np.where(dilated_edge > 40)
        # Apply dark architectural joint color
        joint_color = (40, 45, 55) if lighting not in ["Evening", "Night"] else (15, 20, 30)
        canvas[edge_indices[0], edge_indices[1]] = joint_color
        
        # 5. Landscaping elements: mature campus trees flanking entrance
        tree_green = (40, 105, 45) if lighting not in ["Evening", "Night"] else (20, 55, 30)
        for tx, rad in [(int(w * 0.08), 50), (int(w * 0.92), 55), (int(w * 0.18), 35), (int(w * 0.82), 40)]:
            cv2.line(canvas, (tx, horizon_y), (tx, horizon_y - rad * 2), (40, 50, 65), 4)
            cv2.circle(canvas, (tx, horizon_y - rad * 2 + 10), rad, tree_green, -1)
            cv2.circle(canvas, (tx - 8, horizon_y - rad * 2), rad // 2, (tree_green[0]+25, tree_green[1]+30, tree_green[2]+20), -1)

        # 6. Global Lighting & Atmospheric Bloom Post-Processing
        # Convert to PIL
        rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        
        # Architectural lens bloom / soft glow on highlights
        bloom = pil_img.filter(ImageFilter.GaussianBlur(radius=6))
        pil_img = Image.blend(pil_img, bloom, 0.12)
        
        pil_img.save(save_path, "PNG", quality=95)

