"""
Local ComfyUI provider for CampusVision AI.

The local workflow mirrors the matching ComfyUI Desktop graph: upload the original sketch,
resize/crop to 768x512, run ComfyUI's Canny node (0.4/0.8), then sample with SD 1.5 and
ControlNet Canny.
"""
import asyncio
import logging
import random
import uuid
from io import BytesIO
from typing import Any, Dict

import httpx
from fastapi import HTTPException
from PIL import Image

from backend.config import settings

logger = logging.getLogger("campusvision.comfyui")

SAVE_NODE_ID = "12"


class ComfyUIClient:
    # ---------------------------------------------------------------- workflow
    @staticmethod
    def build_workflow(
        image_name: str,
        prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        seed: int,
        width: int,
        height: int,
        steps: int = 25,
    ) -> Dict[str, Any]:
        """API-format equivalent of the user's SD 1.5 + Canny ControlNet Desktop workflow."""
        return {
            "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": settings.comfyui_checkpoint}},
            "2": {"class_type": "LoadImage", "inputs": {"image": image_name}},
            "3": {"class_type": "ImageScale", "inputs": {
                "image": ["2", 0], "upscale_method": "lanczos", "width": width, "height": height, "crop": "center"}},
            "4": {"class_type": "Canny", "inputs": {
                "image": ["3", 0], "low_threshold": 0.4, "high_threshold": 0.8}},
            "5": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": settings.comfyui_controlnet}},
            "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": prompt}},
            "7": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": negative_prompt}},
            "8": {"class_type": "ControlNetApplyAdvanced", "inputs": {
                "positive": ["6", 0], "negative": ["7", 0], "control_net": ["5", 0], "image": ["4", 0],
                "vae": ["1", 2], "strength": float(controlnet_strength), "start_percent": 0.0, "end_percent": 1.0}},
            "9": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
            "10": {"class_type": "KSampler", "inputs": {
                "model": ["1", 0], "positive": ["8", 0], "negative": ["8", 1], "latent_image": ["9", 0],
                "seed": int(seed), "steps": int(steps), "cfg": float(guidance_scale),
                "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0}},
            "11": {"class_type": "VAEDecode", "inputs": {"samples": ["10", 0], "vae": ["1", 2]}},
            SAVE_NODE_ID: {"class_type": "SaveImage", "inputs": {"images": ["11", 0], "filename_prefix": "CampusVision_API"}},
        }

    # ------------------------------------------------------------------ status
    @staticmethod
    async def check_status() -> Dict[str, Any]:
        base = settings.comfyui_url.rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{base}/system_stats")
            if r.status_code == 200:
                return {"reachable": True, "url": base, "message": "ComfyUI is running."}
            return {"reachable": False, "url": base, "message": f"ComfyUI answered with HTTP {r.status_code}."}
        except Exception as e:
            return {"reachable": False, "url": base, "message": f"Cannot reach ComfyUI at {base}: {e}"}

    # ---------------------------------------------------------------- generate
    @staticmethod
    async def generate(
        sketch_path: str,
        prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        seed: int,
        save_path: str,
    ) -> Dict[str, Any]:
        base = settings.comfyui_url.rstrip("/")
        timeout_s = settings.comfyui_timeout
        used_seed = seed if seed and seed > 0 else random.randint(1, 2**31 - 1)
        # Match the active ComfyUI Desktop graph's 768x512 Canvas Size node.
        width, height = 768, 512

        status = await ComfyUIClient.check_status()
        if not status["reachable"]:
            raise HTTPException(
                status_code=503,
                detail=(f"Local ComfyUI is not reachable at {base}. Open ComfyUI Desktop, wait until it finishes "
                        f"starting, and check COMFYUI_URL (including the port). Details: {status['message']}"),
            )

        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            # 1. Upload the original sketch. ComfyUI performs the same resize and Canny
            # preprocessing as the Desktop graph, instead of receiving the site's separate
            # OpenCV edge map.
            upload_name = f"cv_{uuid.uuid4().hex[:10]}_sketch.png"
            image_buffer = BytesIO()
            with Image.open(sketch_path) as sketch:
                sketch.convert("RGB").save(image_buffer, format="PNG")
            image_bytes = image_buffer.getvalue()
            if not image_bytes:
                raise HTTPException(status_code=400, detail="Could not encode the uploaded sketch for ComfyUI.")
            with BytesIO(image_bytes) as f:
                up = await client.post(
                    f"{base}/upload/image",
                    files={"image": (upload_name, f.read(), "image/png")},
                    data={"type": "input", "overwrite": "true"},
                )
            if up.status_code != 200:
                raise HTTPException(status_code=502, detail=f"ComfyUI upload failed (HTTP {up.status_code}): {up.text[:300]}")
            comfy_name = up.json().get("name", upload_name)
            subfolder = up.json().get("subfolder", "")
            if subfolder:
                comfy_name = f"{subfolder}/{comfy_name}"

            # 2. submit the workflow
            workflow = ComfyUIClient.build_workflow(
                image_name=comfy_name, prompt=prompt, negative_prompt=negative_prompt,
                controlnet_strength=controlnet_strength, guidance_scale=guidance_scale,
                seed=used_seed, width=width, height=height,
            )
            sub = await client.post(f"{base}/prompt", json={"prompt": workflow, "client_id": uuid.uuid4().hex})
            if sub.status_code != 200:
                raise HTTPException(status_code=502, detail=f"ComfyUI rejected the workflow (HTTP {sub.status_code}): {sub.text[:800]}")
            prompt_id = sub.json().get("prompt_id")
            if not prompt_id:
                raise HTTPException(status_code=502, detail=f"ComfyUI did not return a prompt_id: {sub.text[:300]}")
            logger.info(f"ComfyUI job {prompt_id} submitted ({width}x{height}, seed {used_seed})")

            # 3. poll until done
            waited = 0.0
            entry = None
            while waited < timeout_s:
                await asyncio.sleep(1.5)
                waited += 1.5
                h = await client.get(f"{base}/history/{prompt_id}")
                if h.status_code == 200:
                    data = h.json()
                    if prompt_id in data:
                        entry = data[prompt_id]
                        st = entry.get("status", {})
                        if st.get("status_str") == "error":
                            raise HTTPException(status_code=502, detail=f"ComfyUI generation failed: {str(st.get('messages'))[:800]}")
                        if entry.get("outputs"):
                            break
                        if st.get("completed"):
                            break
            if not entry or not entry.get("outputs"):
                raise HTTPException(status_code=504, detail=f"ComfyUI did not finish within {timeout_s} seconds.")

            # 4. download the image
            images = entry["outputs"].get(SAVE_NODE_ID, {}).get("images", [])
            if not images:
                raise HTTPException(status_code=502, detail="ComfyUI finished but returned no image.")
            info = images[0]
            view = await client.get(f"{base}/view", params={
                "filename": info["filename"], "subfolder": info.get("subfolder", ""), "type": info.get("type", "output")})
            if view.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Could not download the result (HTTP {view.status_code}).")

        Image.open(BytesIO(view.content)).convert("RGB").save(save_path, format="PNG")
        return {"seed": used_seed, "width": width, "height": height, "prompt_id": prompt_id}
