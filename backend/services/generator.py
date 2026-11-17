import os
import time
import uuid
import base64
import json
import logging
import asyncio
import socket
from pathlib import Path
from io import BytesIO
from typing import Dict, Any, Optional
import httpx
from PIL import Image, ImageFilter
import cv2
import numpy as np
from fastapi import HTTPException

from backend.config import GENERATED_DIR, UPLOAD_DIR, settings
from backend.services.prompt_builder import (
    PromptBuilder, ARCHITECTURAL_STYLES, LIGHTING_CONDITIONS, BASE_NEGATIVE_PROMPT,
    profile_for_provider
)
from backend.services.cache import global_cache, CampusVisionCache
from backend.database import get_setting
from backend.services.comfyui_client import ComfyUIClient
from backend.services.provider_resolver import resolve_provider

logger = logging.getLogger("campusvision.generator")

class ArchitecturalGenerator:
    @staticmethod
    async def test_provider_credentials(provider: str, api_key: str) -> Dict[str, Any]:
        """
        Validates external API credentials against the respective provider API.
        """
        if provider in ("comfyui", "local"):
            status = await ComfyUIClient.check_status()
            return {"valid": status["reachable"], "provider": "Local ComfyUI", "message": status["message"]}

        if not api_key or not api_key.strip():
            return {"valid": False, "provider": provider, "message": "API key cannot be empty"}

        key = api_key.strip()

        if provider == "replicate":
            test_url = "https://api.replicate.com/v1/account"
            headers = {"Authorization": f"Bearer {key}"}
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.get(test_url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        user = data.get("username") or data.get("name") or "Replicate User"
                        return {
                            "valid": True,
                            "provider": "Replicate",
                            "message": f"Successfully authenticated Replicate account '{user}'. Access granted to cloud GPU predictions."
                        }
                    elif resp.status_code == 401:
                        return {
                            "valid": False,
                            "provider": "Replicate",
                            "message": "Replicate authentication failed (HTTP 401): Invalid API token. Please verify the token at replicate.com/account/api-tokens."
                        }
                    elif resp.status_code == 402:
                        return {
                            "valid": False,
                            "provider": "Replicate",
                            "message": "Replicate billing check (HTTP 402): Account has insufficient credits or requires payment setup."
                        }
                    elif resp.status_code == 403:
                        return {
                            "valid": False,
                            "provider": "Replicate",
                            "message": "Replicate access forbidden (HTTP 403): Token lacks permission to access the Replicate API."
                        }
                    else:
                        return {
                            "valid": False,
                            "provider": "Replicate",
                            "message": f"Replicate API error (HTTP {resp.status_code}): {resp.text[:150]}"
                        }
            except (socket.gaierror, httpx.ConnectError) as ce:
                err_text = str(ce)
                if "nodename nor servname" in err_text or "Errno 8" in err_text:
                    return {
                        "valid": False,
                        "provider": "Replicate",
                        "message": (
                            "DNS resolution error: The backend process cannot resolve 'api.replicate.com' ([Errno 8]). "
                            "This occurs when the backend is running in an environment or sandbox without outbound network access. "
                            "Please run the backend directly on your host Mac via './start.sh'."
                        )
                    }
                return {
                    "valid": False,
                    "provider": "Replicate",
                    "message": f"Network connection error to api.replicate.com: {err_text}"
                }
            except httpx.TimeoutException:
                return {
                    "valid": False,
                    "provider": "Replicate",
                    "message": "Network timeout: Connection to api.replicate.com timed out."
                }
            except Exception as e:
                return {"valid": False, "provider": "Replicate", "message": f"Connection error: {str(e)}"}

        elif provider in ["huggingface", "hf"]:
            test_url = "https://huggingface.co/api/whoami-v2"
            headers = {"Authorization": f"Bearer {key}"}
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(test_url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        user = data.get("name") or data.get("fullname") or "User"
                        return {
                            "valid": True,
                            "provider": "Hugging Face",
                            "message": f"Successfully authenticated as Hugging Face user '{user}'. Access granted to Inference API."
                        }
                    else:
                        return {
                            "valid": False,
                            "provider": "Hugging Face",
                            "message": f"Authentication failed (HTTP {resp.status_code}): Invalid token or insufficient permissions."
                        }
            except Exception as e:
                return {"valid": False, "provider": "Hugging Face", "message": f"Connection error: {str(e)}"}

        elif provider in ["fal", "fal_ai"]:
            test_url = "https://fal.run/fal-ai/fast-sdxl/image-to-image"
            headers = {"Authorization": f"Key {key}", "Content-Type": "application/json"}
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(test_url, headers=headers, json={"prompt": "ping"})
                    if resp.status_code in [200, 422]:
                        return {
                            "valid": True,
                            "provider": "Fal.ai",
                            "message": "Successfully authenticated with Fal.ai API."
                        }
                    else:
                        return {
                            "valid": False,
                            "provider": "Fal.ai",
                            "message": f"Fal.ai authentication failed (HTTP {resp.status_code}): Invalid key."
                        }
            except Exception as e:
                return {"valid": False, "provider": "Fal.ai", "message": f"Connection error: {str(e)}"}

        return {"valid": False, "provider": provider, "message": f"Unsupported provider: {provider}"}

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
        resolution: str = "1024x768",
        negative_prompt_override: Optional[str] = None,
        provider_override: Optional[str] = None,
        compiled_prompt_override: Optional[str] = None,
        prompt_mode: str = "architecture"
    ) -> Dict[str, Any]:
        """
        Executes the architectural image-to-image pipeline:
        1. Compiles intelligent architectural prompt
        2. Detects provider (Replicate / Hugging Face / Fal / Demo Mode)
        3. Generates an image using the selected engine and its supported sketch-conditioning method
        4. Saves and returns detailed generation metadata
        """
        start_time = time.time()
        
        # Check active provider & API keys
        settings.reload()
        hf_key = get_setting("HUGGINGFACE_API_KEY") or settings.huggingface_api_key or os.getenv("HUGGINGFACE_API_KEY", "")
        replicate_token = get_setting("REPLICATE_API_TOKEN") or settings.replicate_api_token or os.getenv("REPLICATE_API_TOKEN", "")
        fal_key = get_setting("FAL_KEY") or settings.fal_key or os.getenv("FAL_KEY", "")

        preferred_provider = provider_override or get_setting("DEFAULT_PROVIDER") or settings.default_provider
        target_provider = preferred_provider.lower().strip()

        def _usable(key: str) -> bool:
            return bool(key and key.strip() and not key.strip().startswith("demo"))

        # "auto": cloud token first (Replicate, Hugging Face, Fal), otherwise local ComfyUI if it is running
        if target_provider == "auto":
            target_provider = resolve_provider(
                target_provider,
                _usable(replicate_token),
                _usable(hf_key),
                _usable(fal_key),
            )
            if target_provider in ("comfyui", "local") and not (await ComfyUIClient.check_status())["reachable"]:
                if (prompt_mode or "architecture").strip().lower() == "custom":
                    raise HTTPException(
                        status_code=400,
                        detail="Auto mode found no cloud API key and local ComfyUI is not running. Add a cloud key or start ComfyUI; Demo mode cannot generate custom subjects."
                    )
                raise HTTPException(
                    status_code=400,
                    detail="Auto mode found no cloud API key and local ComfyUI is not running. "
                           "Add a key in Settings, start ComfyUI, or choose Demo mode."
                )

        # 1. Compile architecture prompts for the selected model. Custom sketches
        # use the user's prompt verbatim so no building/style terms are injected.
        prompt_profile = profile_for_provider(target_provider)
        prompt_mode = (prompt_mode or "architecture").strip().lower()
        if prompt_mode not in ("architecture", "custom"):
            raise HTTPException(status_code=400, detail="Prompt mode must be 'architecture' or 'custom'.")

        if prompt_mode == "custom":
            compiled_prompt = (compiled_prompt_override or user_prompt or "").strip()
            if not compiled_prompt:
                raise HTTPException(status_code=400, detail="Enter a positive prompt for your custom sketch.")
            effective_negative_prompt = (
                negative_prompt_override.strip()
                if negative_prompt_override is not None
                else "low quality, blurry, distorted, deformed subject, duplicate subject, malformed features, text, watermark"
            )
            if target_provider == "demo":
                raise HTTPException(
                    status_code=400,
                    detail="The Demo engine only draws architectural examples and cannot interpret custom subjects. Select Local ComfyUI or configure a cloud diffusion provider."
                )
        else:
            prompt_data = PromptBuilder.build_prompt(
                user_prompt=user_prompt,
                style=style,
                building_type=building_type,
                lighting=lighting,
                materials=materials,
                profile=prompt_profile
            )
            compiled_prompt = (
                compiled_prompt_override.strip()
                if (compiled_prompt_override and compiled_prompt_override.strip())
                else prompt_data["compiled_prompt"]
            )
            effective_negative_prompt = (
                negative_prompt_override.strip()
                if (negative_prompt_override and negative_prompt_override.strip())
                else prompt_data["negative_prompt"]
            )

        gen_id = str(uuid.uuid4())[:8]
        render_filename = f"{gen_id}_render.png"
        render_path = GENERATED_DIR / render_filename
        
        is_demo_mode = False
        active_provider = ""
        status_message = ""
        model_name_label = None
        model_version_label = None
        used_seed = None
        structure_lost = False

        # Local ComfyUI now conditions on the original sketch and runs its own Canny node.
        # Cloud providers continue to use the precomputed edge map.
        cache_input_path = sketch_path if target_provider in ["comfyui", "local"] else edge_path

        # Check deterministic generation cache (for fixed seeds > 0)
        cache_key = None
        if seed > 0 and os.path.exists(cache_input_path):
            with open(cache_input_path, "rb") as ef:
                edge_bytes = ef.read()
            cache_key = CampusVisionCache.hash_generation(
                edge_bytes=edge_bytes,
                compiled_prompt=compiled_prompt,
                negative_prompt=effective_negative_prompt,
                controlnet_strength=controlnet_strength,
                guidance_scale=guidance_scale,
                seed=seed,
                resolution=resolution,
                model_version=(
                    f"{target_provider}:{settings.replicate_version}" if target_provider == "replicate"
                    else f"{target_provider}:{settings.comfyui_checkpoint}:{settings.comfyui_controlnet}:desktop-canny-0.4-0.8-768x512-v2" if target_provider in ["comfyui", "local"]
                    else f"{target_provider}:denoise{denoising_strength:.2f}"
                )
            )
            cached_gen = global_cache.get_generation(cache_key)
            if cached_gen:
                logger.info(f"Deterministic generation cache hit for key {cache_key[:16]}...")
                return {
                    **cached_gen,
                    "cache_hit": True,
                    "status_message": "Instant retrieval from deterministic architectural render cache."
                }

        # -------------------------------------------------------------
        # BRANCH A: Explicit Demo Simulation Mode
        # -------------------------------------------------------------
        if target_provider == "demo":
            logger.info("Generating in explicit Demo Simulation Mode (procedural synthesis)...")
            ArchitecturalGenerator._generate_procedural_photoreal(
                sketch_path=sketch_path,
                edge_path=edge_path,
                style=style,
                building_type=building_type,
                lighting=lighting,
                user_prompt=user_prompt,
                save_path=str(render_path)
            )
            is_demo_mode = True
            active_provider = "Demo Architectural Engine (Procedural Simulation)"
            status_message = (
                "Generated via procedural geometry synthesis engine for offline demonstration. "
                "To execute live image-to-image diffusion on cloud GPUs, add a Replicate API token in Settings."
            )

        # -------------------------------------------------------------
        # BRANCH B: Replicate (Primary Provider)
        # -------------------------------------------------------------
        elif target_provider == "replicate":
            if not _usable(replicate_token):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "REPLICATE_API_TOKEN is not configured. Add your Replicate token in Settings or .env, "
                        "or switch to Local ComfyUI / Demo mode."
                    )
                )
            logger.info(f"Executing live ControlNet generation via Replicate ({settings.replicate_model})...")
            await ArchitecturalGenerator._generate_with_replicate(
                replicate_token=replicate_token.strip(),
                edge_path=edge_path,
                prompt=compiled_prompt,
                negative_prompt=effective_negative_prompt,
                controlnet_strength=controlnet_strength,
                guidance_scale=guidance_scale,
                seed=seed,
                save_path=str(render_path)
            )
            active_provider = f"Replicate SDXL ControlNet ({settings.replicate_model})"
            status_message = "Concept image generated via Replicate with ControlNet conditioning."

        # -------------------------------------------------------------
        # BRANCH C: Hugging Face (Secondary Provider)
        # -------------------------------------------------------------
        elif target_provider in ["huggingface", "hf"]:
            if not hf_key or not hf_key.strip() or hf_key.strip().startswith("demo"):
                raise HTTPException(
                    status_code=400,
                    detail="HUGGINGFACE_API_KEY is not configured. Please add your Hugging Face API key in Settings or .env."
                )
            logger.info("Executing live ControlNet generation via Hugging Face...")
            hf_text_only = await ArchitecturalGenerator._generate_with_huggingface(
                hf_key=hf_key.strip(),
                edge_path=edge_path,
                prompt=compiled_prompt,
                negative_prompt=effective_negative_prompt,
                controlnet_strength=controlnet_strength,
                guidance_scale=guidance_scale,
                save_path=str(render_path),
                allow_text_only_fallback=(prompt_mode != "custom")
            )
            structure_lost = bool(hf_text_only)
            active_provider = "Hugging Face SDXL (Live Cloud GPU)"
            status_message = (
                "Hugging Face could not run ControlNet, so plain SDXL text-to-image was used. "
                "The sketch's structure was NOT preserved; use Local ComfyUI or Replicate for faithful renders."
                if structure_lost else
                "Concept image generated via Hugging Face Inference API with sketch conditioning."
            )

        # -------------------------------------------------------------
        # BRANCH D: Fal.ai (Secondary Provider)
        # -------------------------------------------------------------
        elif target_provider in ["fal", "fal_ai"]:
            if not fal_key or not fal_key.strip() or fal_key.strip().startswith("demo"):
                raise HTTPException(
                    status_code=400,
                    detail="FAL_KEY is not configured. Please add your Fal.ai API key in Settings or .env."
                )
            logger.info("Executing live generation via Fal.ai...")
            await ArchitecturalGenerator._generate_with_fal(
                fal_key=fal_key.strip(),
                sketch_path=sketch_path,
                prompt=compiled_prompt,
                negative_prompt=effective_negative_prompt,
                guidance_scale=guidance_scale,
                strength=denoising_strength,
                save_path=str(render_path)
            )
            active_provider = "Fal.ai Fast SDXL Img2Img (Live Cloud GPU)"
            status_message = "Concept image generated via Fal.ai image-to-image."

        # -------------------------------------------------------------
        # BRANCH E: Local ComfyUI (free, runs on this machine)
        # -------------------------------------------------------------
        elif target_provider in ["comfyui", "local"]:
            logger.info("Executing live ControlNet generation via local ComfyUI (SD 1.5 + ControlNet Canny)...")
            comfy = await ComfyUIClient.generate(
                sketch_path=sketch_path,
                prompt=compiled_prompt,
                negative_prompt=effective_negative_prompt,
                controlnet_strength=controlnet_strength,
                guidance_scale=guidance_scale,
                seed=seed,
                save_path=str(render_path)
            )
            used_seed = comfy["seed"]
            resolution = f"{comfy['width']}x{comfy['height']}"
            active_provider = "Local ComfyUI (SD 1.5 + ControlNet Canny)"
            model_name_label = "SD 1.5 + ControlNet Canny (local ComfyUI)"
            model_version_label = settings.comfyui_checkpoint
            status_message = f"Concept image generated locally via ComfyUI at {comfy['width']}x{comfy['height']}."

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported provider '{preferred_provider}'. Supported: replicate, huggingface, fal, comfyui, demo, auto."
            )

        elapsed = round(time.time() - start_time, 2)

        # Report dimensions that the engine actually saved, not the requested UI value.
        aspect_ratio = "4:3"
        try:
            with Image.open(render_path) as rendered_image:
                output_width, output_height = rendered_image.size
            resolution = f"{output_width}x{output_height}"
            from math import gcd
            divisor = gcd(output_width, output_height) or 1
            aspect_ratio = f"{output_width // divisor}:{output_height // divisor}"
        except Exception as image_metadata_error:
            logger.warning("Could not read generated image dimensions: %s", image_metadata_error)
            resolution = "unknown"
            aspect_ratio = "unknown"

        res_data = {
            "render_id": gen_id,
            "render_url": f"/generated/{render_filename}",
            "render_path": str(render_path),
            "compiled_prompt": compiled_prompt,
            "negative_prompt": effective_negative_prompt,
            "style": style,
            "building_type": building_type,
            "lighting": lighting,
            "materials": materials,
            "controlnet_strength": controlnet_strength,
            "denoising_strength": denoising_strength,
            "guidance_scale": guidance_scale,
            # Only report a seed when the selected engine actually accepts it.
            # HF, Fal, and the procedural Demo path ignore this request field.
            "seed": used_seed if used_seed is not None else (
                seed if target_provider == "replicate" and seed > 0 else -1
            ),
            "prompt_profile": prompt_profile,
            "structure_conditioned": (target_provider in ("comfyui", "local", "replicate", "huggingface", "hf", "demo")) and not structure_lost,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "inference_time_sec": elapsed,
            "provider": active_provider,
            "is_demo_mode": is_demo_mode,
            "model_name": model_name_label or (
                "Procedural Synthesis Engine" if is_demo_mode
                else {"huggingface": "SDXL via Hugging Face Inference", "hf": "SDXL via Hugging Face Inference",
                      "fal": "fal-ai/fast-sdxl image-to-image", "fal_ai": "fal-ai/fast-sdxl image-to-image"}.get(target_provider, settings.replicate_model)),
            "model_version": model_version_label or (
                "v2.0" if is_demo_mode else (settings.replicate_version if target_provider == "replicate" else "hosted")),
            "cache_hit": False,
            "status_message": status_message
        }
        
        # Cache successful deterministic generation
        if seed > 0 and cache_key:
            global_cache.put_generation(cache_key, res_data)
            
        return res_data

    @staticmethod
    async def _generate_with_replicate(
        replicate_token: str,
        edge_path: str,
        prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        seed: int,
        save_path: str
    ):
        """
        Calls Replicate API for genuine ControlNet Canny image-to-image diffusion.
        
        Pipeline:
        1. Encodes the OpenCV Canny edge map to a base64 data URI.
        2. Creates prediction against lucataco/sdxl-controlnet with structural conditioning parameters.
        3. Polls asynchronously with asyncio.sleep(2) until prediction succeeds or fails.
        4. Validates and downloads generated image bytes directly to local storage.
        """
        if not os.path.exists(edge_path):
            raise HTTPException(
                status_code=400,
                detail=f"OpenCV structural edge map not found at '{edge_path}'. Sketch preprocessing required."
            )

        with open(edge_path, "rb") as f:
            edge_b64 = base64.b64encode(f.read()).decode("utf-8")
        data_uri = f"data:image/png;base64,{edge_b64}"
        
        headers = {
            "Authorization": f"Bearer {replicate_token}",
            "Content-Type": "application/json"
        }

        # Build payload adhering strictly to lucataco/sdxl-controlnet schema
        input_payload: Dict[str, Any] = {
            "image": data_uri,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "condition_scale": round(float(controlnet_strength), 2),
            "guidance_scale": round(float(guidance_scale), 2),
            "num_inference_steps": 30
        }
        if seed is not None and seed > 0:
            input_payload["seed"] = int(seed)

        create_url = "https://api.replicate.com/v1/predictions"
        payload = {
            "version": settings.replicate_version,
            "input": input_payload
        }
        
        timeout_config = httpx.Timeout(180.0, connect=15.0)
        async with httpx.AsyncClient(timeout=timeout_config) as client:
            try:
                resp = await client.post(create_url, headers=headers, json=payload)
            except Exception as conn_err:
                err_text = str(conn_err)
                if "nodename nor servname" in err_text or "Errno 8" in err_text:
                    raise HTTPException(
                        status_code=503,
                        detail=(
                            "DNS resolution error: The backend process cannot resolve 'api.replicate.com' ([Errno 8]). "
                            "The backend is executing in an isolated sandbox or container without outbound network permissions. "
                            "Please run './start.sh' directly in your Mac terminal so the process has full host network access."
                        )
                    )
                raise HTTPException(
                    status_code=503,
                    detail=f"Failed to connect to Replicate API: {err_text}"
                )

            # Check HTTP response codes from prediction submission
            if resp.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication failed: Invalid Replicate API token. Please check your credentials in Settings or .env."
                )
            elif resp.status_code == 402:
                raise HTTPException(
                    status_code=402,
                    detail="Replicate billing check: Your Replicate account has insufficient credits or requires payment method setup."
                )
            elif resp.status_code == 404:
                raise HTTPException(
                    status_code=503,
                    detail=f"Replicate model version '{settings.replicate_version[:12]}' not found or unavailable."
                )
            elif resp.status_code == 422:
                raise HTTPException(
                    status_code=422,
                    detail=f"Replicate schema validation error: {resp.text[:300]}"
                )
            elif resp.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail="Replicate rate limit exceeded. Please wait a moment before initiating another generation."
                )
            elif resp.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=502,
                    detail=f"Replicate API error (HTTP {resp.status_code}): {resp.text[:300]}"
                )

            pred = resp.json()
            pred_id = pred.get("id")
            poll_url = pred.get("urls", {}).get("get") or f"https://api.replicate.com/v1/predictions/{pred_id}"
            
            logger.info(f"Replicate prediction created: {pred_id}. Polling {poll_url}...")

            max_polls = max(15, settings.replicate_poll_timeout // 2)
            for poll_idx in range(max_polls):
                # Correct non-blocking async sleep
                await asyncio.sleep(2)
                
                try:
                    p_resp = await client.get(poll_url, headers=headers)
                except Exception as poll_err:
                    logger.warning(f"Replicate poll error at step {poll_idx}: {poll_err}")
                    continue

                if p_resp.status_code == 401:
                    raise HTTPException(
                        status_code=401,
                        detail="Replicate authentication failed during status polling."
                    )
                elif p_resp.status_code != 200:
                    logger.warning(f"Replicate poll returned HTTP {p_resp.status_code}")
                    continue

                p_data = p_resp.json()
                status = p_data.get("status")

                if status == "succeeded":
                    output = p_data.get("output")
                    if isinstance(output, list) and len(output) > 0:
                        out_url = output[0]
                    elif isinstance(output, str):
                        out_url = output
                    else:
                        raise HTTPException(
                            status_code=502,
                            detail="Replicate reported success but returned an empty output array."
                        )

                    logger.info(f"Replicate prediction {pred_id} succeeded. Downloading generated image from {out_url[:60]}...")
                    
                    # Download generated image with timeout
                    img_resp = await client.get(out_url, timeout=45.0)
                    if img_resp.status_code != 200:
                        raise HTTPException(
                            status_code=502,
                            detail=f"Failed to download generated render from Replicate CDN (HTTP {img_resp.status_code})."
                        )
                    
                    # Validate image bytes
                    try:
                        pil_img = Image.open(BytesIO(img_resp.content))
                        pil_img.verify()
                    except Exception as val_err:
                        raise HTTPException(
                            status_code=502,
                            detail=f"Downloaded file from Replicate is not a valid image: {str(val_err)}"
                        )

                    # Re-open and save safely
                    pil_img = Image.open(BytesIO(img_resp.content))
                    pil_img.save(save_path, "PNG", quality=95)
                    logger.info(f"Successfully saved Replicate render to {save_path}")
                    return

                elif status == "failed":
                    error_msg = p_data.get("error") or "Unknown error during cloud diffusion"
                    logger.error(f"Replicate prediction {pred_id} failed: {error_msg}")
                    raise HTTPException(
                        status_code=502,
                        detail=f"Replicate Cloud GPU generation failed: {error_msg}"
                    )

                elif status == "canceled":
                    raise HTTPException(
                        status_code=499,
                        detail="Replicate prediction was canceled."
                    )

            # Polling timed out
            raise HTTPException(
                status_code=504,
                detail=f"Replicate generation timed out after {settings.replicate_poll_timeout} seconds."
            )

    @staticmethod
    async def _generate_with_huggingface(
        hf_key: str,
        edge_path: str,
        prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        save_path: str,
        allow_text_only_fallback: bool = True
    ):
        """Calls Hugging Face Inference API for ControlNet / SDXL image generation."""
        if not os.path.exists(edge_path):
            raise HTTPException(status_code=400, detail="Canny edge map not found.")

        with open(edge_path, "rb") as f:
            edge_b64 = base64.b64encode(f.read()).decode("utf-8")
            
        # NOTE: the HF serverless API does not reliably host ControlNet pipelines. The first two
        # endpoints try the ControlNet model; the last one is plain SDXL text-to-image, where the edge
        # map cannot be used (the prompt must be sent as `inputs`, never the image).
        endpoints = [
            ("https://router.huggingface.co/hf-inference/models/diffusers/controlnet-canny-sdxl-1.0", True),
            ("https://api-inference.huggingface.co/models/diffusers/controlnet-canny-sdxl-1.0", True),
        ]
        if allow_text_only_fallback:
            endpoints.append(("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", False))

        headers = {
            "Authorization": f"Bearer {hf_key}",
            "Content-Type": "application/json"
        }

        def _payload(with_edges: bool) -> Dict[str, Any]:
            params: Dict[str, Any] = {
                "negative_prompt": negative_prompt,
                "guidance_scale": guidance_scale,
                "num_inference_steps": 30,
            }
            if with_edges:
                params["controlnet_conditioning_scale"] = controlnet_strength
                return {"inputs": prompt, "image": f"data:image/png;base64,{edge_b64}", "parameters": params}
            return {"inputs": prompt, "parameters": params}

        last_error = None
        async with httpx.AsyncClient(timeout=120.0) as client:
            for ep, with_edges in endpoints:
                try:
                    resp = await client.post(ep, headers=headers, json=_payload(with_edges))
                    if resp.status_code == 200:
                        try:
                            pil_test = Image.open(BytesIO(resp.content))
                            pil_test.verify()
                        except Exception as e:
                            last_error = f"Invalid image returned from HF: {e}"
                            continue
                        with open(save_path, "wb") as out_f:
                            out_f.write(resp.content)
                        if not with_edges:
                            logger.warning("HF fallback used plain SDXL text-to-image: sketch structure was NOT preserved.")
                        return not with_edges
                    elif resp.status_code == 401:
                        raise HTTPException(
                            status_code=401,
                            detail="Hugging Face authentication failed: Invalid API key."
                        )
                    elif resp.status_code == 429:
                        raise HTTPException(
                            status_code=429,
                            detail="Hugging Face rate limit exceeded. Please wait a moment."
                        )
                    else:
                        last_error = f"HF {ep} returned HTTP {resp.status_code}: {resp.text[:150]}"
                except HTTPException:
                    raise
                except Exception as ex:
                    last_error = str(ex)
                    
        detail = f"Hugging Face Inference call failed: {last_error or 'Unknown error'}"
        if not allow_text_only_fallback:
            detail = (
                "Hugging Face ControlNet is unavailable, so it cannot preserve this custom sketch. "
                "Use Local ComfyUI, Replicate, or Fal for sketch-conditioned custom images. "
                f"Last error: {last_error or 'Unknown error'}"
            )
        raise HTTPException(
            status_code=502,
            detail=detail
        )

    @staticmethod
    async def _generate_with_fal(
        fal_key: str,
        sketch_path: str,
        prompt: str,
        negative_prompt: str,
        guidance_scale: float,
        save_path: str,
        strength: float = 0.70
    ):
        """Calls Fal.ai API for fast SDXL image-to-image generation (init image = the sketch, no ControlNet)."""
        if not os.path.exists(sketch_path):
            raise HTTPException(status_code=400, detail="Sketch image file not found.")

        with open(sketch_path, "rb") as f:
            sketch_b64 = base64.b64encode(f.read()).decode("utf-8")
        data_uri = f"data:image/png;base64,{sketch_b64}"
        
        headers = {
            "Authorization": f"Key {fal_key}",
            "Content-Type": "application/json"
        }
        
        endpoint = "https://fal.run/fal-ai/fast-sdxl/image-to-image"
        payload = {
            "image_url": data_uri,
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "guidance_scale": guidance_scale,
            "strength": round(float(strength), 2)
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Fal.ai authentication failed: Invalid API key.")
            elif resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"Fal.ai returned HTTP {resp.status_code}: {resp.text[:150]}")
            
            res_json = resp.json()
            img_url = res_json.get("images", [{}])[0].get("url")
            if not img_url:
                raise HTTPException(status_code=502, detail="No output image URL found in Fal.ai response.")
            img_resp = await client.get(img_url, timeout=30.0)
            if img_resp.status_code != 200:
                raise HTTPException(status_code=502, detail="Failed to download image from Fal.ai CDN.")
            with open(save_path, "wb") as f_out:
                f_out.write(img_resp.content)

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
        Procedural preview engine:
        Used strictly for explicit Demo Simulation Mode.
        Takes the user's REAL uploaded sketch, uses the actual OpenCV extracted edge map
        for structural geometry, applies architectural material shaders, lighting atmosphere,
        campus landscaping, and optical post-processing.
        """
        # Load user's real sketch and real edge map
        sketch_bgr = cv2.imread(sketch_path)
        edge_gray = cv2.imread(edge_path, cv2.IMREAD_GRAYSCALE) if edge_path and os.path.exists(edge_path) else None
        
        if sketch_bgr is None:
            sketch_bgr = np.ones((768, 1024, 3), dtype=np.uint8) * 240
            
        h, w = sketch_bgr.shape[:2]
        if edge_gray is None or edge_gray.shape[:2] != (h, w):
            gray = cv2.cvtColor(sketch_bgr, cv2.COLOR_BGR2GRAY)
            edge_gray = cv2.Canny(gray, 50, 150)
            
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
            canvas[y, :] = (b, g, r)
            
        # Render campus ground
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
        if style == "Modern Minimalist":
            facade_tone = (225, 225, 228)
            glass_tone = (210, 180, 130)
        elif style == "Sustainable / Green Architecture":
            facade_tone = (175, 190, 175)
            glass_tone = (195, 190, 140)
        elif style == "Futuristic Parametric":
            facade_tone = (195, 200, 210)
            glass_tone = (230, 210, 160)
        elif style == "Traditional Indian Heritage":
            facade_tone = (85, 110, 185)
            glass_tone = (140, 170, 200)
        elif style == "Institutional Brutalist":
            facade_tone = (140, 145, 155)
            glass_tone = (180, 165, 130)
        else:
            facade_tone = (215, 215, 215)
            glass_tone = (215, 185, 140)
            
        if lighting in ["Evening", "Night"]:
            glass_tone = (120, 210, 255)
            
        # 3. Structural Condition: Use the user's extracted edge map to synthesize building facade
        edge_pts = np.where(edge_gray > 40)
        if len(edge_pts[0]) > 50:
            min_y, max_y = int(np.min(edge_pts[0])), int(np.max(edge_pts[0]))
            min_x, max_x = int(np.min(edge_pts[1])), int(np.max(edge_pts[1]))
            max_y = max(max_y, horizon_y)
            
            # Fill building silhouette with facade material
            cv2.rectangle(canvas, (min_x, min_y), (max_x, max_y), facade_tone, -1)
            
            # Add horizontal floor plate stratification
            floors = 4
            floor_step = max(10, (max_y - min_y) // floors)
            for fl in range(1, floors):
                fy = min_y + fl * floor_step
                cv2.line(canvas, (min_x, fy), (max_x, fy), (90, 95, 105), 3)
                
            # Window glazing bands
            for fl in range(floors):
                fy1 = min_y + fl * floor_step + 10
                fy2 = min_y + (fl + 1) * floor_step - 12
                if fy2 > fy1:
                    cv2.rectangle(canvas, (min_x + 15, fy1), (max_x - 15, fy2), glass_tone, -1)
                    cv2.rectangle(canvas, (min_x + 15, fy1), (max_x - 15, fy2), (50, 55, 65), 2)
                    for mx in range(min_x + 65, max_x - 15, 50):
                        cv2.line(canvas, (mx, fy1), (mx, fy2), (50, 55, 65), 1)
                        cv2.line(canvas, (mx - 30, fy1 + 5), (mx - 10, fy2 - 5), (255, 255, 255), 2)
        else:
            cv2.rectangle(canvas, (int(w * 0.15), int(h * 0.3)), (int(w * 0.85), horizon_y), facade_tone, -1)

        # 4. Integrate precise structural edge contours from the sketch
        dilated_edge = cv2.dilate(edge_gray, np.ones((2, 2), np.uint8), iterations=1)
        edge_indices = np.where(dilated_edge > 40)
        joint_color = (40, 45, 55) if lighting not in ["Evening", "Night"] else (15, 20, 30)
        canvas[edge_indices[0], edge_indices[1]] = joint_color
        
        # 5. Landscaping elements: campus trees
        tree_green = (40, 105, 45) if lighting not in ["Evening", "Night"] else (20, 55, 30)
        for tx, rad in [(int(w * 0.08), 50), (int(w * 0.92), 55), (int(w * 0.18), 35), (int(w * 0.82), 40)]:
            cv2.line(canvas, (tx, horizon_y), (tx, horizon_y - rad * 2), (40, 50, 65), 4)
            cv2.circle(canvas, (tx, horizon_y - rad * 2 + 10), rad, tree_green, -1)
            cv2.circle(canvas, (tx - 8, horizon_y - rad * 2), rad // 2, (tree_green[0]+25, tree_green[1]+30, tree_green[2]+20), -1)

        # 6. Global Lighting & Atmospheric Bloom Post-Processing
        rgb = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb)
        
        bloom = pil_img.filter(ImageFilter.GaussianBlur(radius=6))
        pil_img = Image.blend(pil_img, bloom, 0.12)
        
        pil_img.save(save_path, "PNG", quality=95)
