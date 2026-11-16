import os
import time
import uuid
from pathlib import Path
from typing import Tuple, Dict, Any, Optional, List
import cv2
import numpy as np
from PIL import Image

from backend.config import UPLOAD_DIR, settings
from backend.services.cache import global_cache, CampusVisionCache

# Officially trained SDXL Native Aspect-Ratio Buckets
SDXL_ASPECT_RATIO_BUCKETS: List[Tuple[int, int, str, str]] = [
    (1024, 1024, "1:1", "Square Architectural Quad"),
    (1152, 896, "4:3", "Landscape Standard Academic Block"),
    (1216, 832, "3:2", "Landscape Classic Elevation"),
    (1344, 768, "16:9", "Widescreen Campus Panoramic"),
    (1536, 640, "21:9", "Ultra-wide Masterplan Vista"),
    (896, 1152, "3:4", "Portrait Institutional Atrium"),
    (832, 1216, "2:3", "Vertical Campus Belltower"),
    (768, 1344, "9:16", "Vertical High-Rise Elevation"),
]

class ImageProcessor:
    @staticmethod
    def select_sdxl_bucket(width: int, height: int) -> Tuple[int, int, str, str]:
        """
        Determines the optimal native SDXL diffusion resolution bucket
        that best preserves the input sketch's natural architectural aspect ratio.
        """
        ratio = width / max(1, height)
        best_bucket = SDXL_ASPECT_RATIO_BUCKETS[0]
        min_diff = float("inf")
        
        for bw, bh, rat_str, label in SDXL_ASPECT_RATIO_BUCKETS:
            diff = abs((bw / bh) - ratio)
            if diff < min_diff:
                min_diff = diff
                best_bucket = (bw, bh, rat_str, label)
                
        return best_bucket

    @staticmethod
    def validate_and_save(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Validates uploaded image and saves it to the uploads directory."""
        if len(file_bytes) > settings.max_upload_size_mb * 1024 * 1024:
            raise ValueError(f"File size exceeds maximum allowed size ({settings.max_upload_size_mb}MB)")
            
        ext = Path(filename).suffix.lower()
        if ext not in settings.allowed_extensions:
            raise ValueError(f"Unsupported file format '{ext}'. Allowed: {', '.join(settings.allowed_extensions)}")
            
        # Verify valid image using PIL
        try:
            from io import BytesIO
            img = Image.open(BytesIO(file_bytes))
            img.verify()
        except Exception as e:
            raise ValueError(f"Uploaded file is not a valid image: {str(e)}")
            
        # Re-open after verify()
        img = Image.open(BytesIO(file_bytes)).convert("RGB")
        
        file_id = str(uuid.uuid4())[:8]
        safe_name = f"{file_id}_sketch{ext}"
        save_path = UPLOAD_DIR / safe_name
        img.save(save_path)
        
        # Now run multi-resolution OpenCV edge preprocessing with caching
        proc_result = ImageProcessor.process_sketch(str(save_path), file_id, file_bytes=file_bytes)
        
        return {
            "sketch_id": file_id,
            "filename": safe_name,
            "sketch_url": f"/uploads/{safe_name}",
            "edge_url": proc_result["edge_url"],
            "blueprint_url": proc_result["blueprint_url"],
            "width": proc_result["width"],
            "height": proc_result["height"],
            "aspect_ratio": proc_result.get("aspect_ratio", "4:3"),
            "aspect_label": proc_result.get("aspect_label", "Standard"),
            "edge_density": proc_result["edge_density"],
            "cache_hit": proc_result.get("cache_hit", False)
        }

    @staticmethod
    def process_sketch(
        image_path: str,
        file_id: str,
        low_threshold: Optional[int] = None,
        high_threshold: Optional[int] = None,
        file_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Advanced Multi-Resolution OpenCV Architectural Preprocessor with Deterministic Caching:
        1. Selects optimal SDXL native aspect-ratio bucket (1:1, 4:3, 16:9, 21:9, etc.)
        2. Fits sketch without distortion using clean architectural letterboxing
        3. Contrast-Limited Adaptive Histogram Equalization (CLAHE) to reveal subtle pencil strokes
        4. Bilateral line-preserving noise filtration
        5. Luminance-adaptive Canny edge extraction with morphological lineart dilation
        6. Blueprint visualization overlay with coordinate grid
        """
        t0 = time.time()
        
        if file_bytes is None and os.path.exists(image_path):
            with open(image_path, "rb") as f:
                file_bytes = f.read()

        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            raise ValueError("Failed to read image with OpenCV")
            
        orig_h, orig_w = img_bgr.shape[:2]
        
        # 1. Multi-Resolution Aspect Ratio Selection
        target_w, target_h, aspect_str, aspect_label = ImageProcessor.select_sdxl_bucket(orig_w, orig_h)
        
        # Check deterministic preprocessing cache
        if file_bytes:
            cache_key = CampusVisionCache.hash_preproc(file_bytes, low_threshold, high_threshold, aspect_str)
            cached_result = global_cache.get_preproc(cache_key)
            if cached_result:
                # Return cached paths but link to current file_id
                return {
                    **cached_result,
                    "cache_hit": True
                }

        # 2. Aspect-Ratio Preserving Resize & Letterbox (Zero Distortion)
        scale = min(target_w / orig_w, target_h / orig_h)
        scaled_w = int(orig_w * scale)
        scaled_h = int(orig_h * scale)
        
        resized_sketch = cv2.resize(img_bgr, (scaled_w, scaled_h), interpolation=cv2.INTER_AREA)
        
        # Place centered onto target canvas with pure paper-white background
        canvas = np.ones((target_h, target_w, 3), dtype=np.uint8) * 255
        x_offset = (target_w - scaled_w) // 2
        y_offset = (target_h - scaled_h) // 2
        canvas[y_offset:y_offset + scaled_h, x_offset:x_offset + scaled_w] = resized_sketch
        
        # 3. Convert to grayscale & CLAHE enhancement
        gray = cv2.cvtColor(canvas, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        # 4. Bilateral filter preserves sharp building boundaries while smoothing grain
        blurred = cv2.bilateralFilter(enhanced, d=7, sigmaColor=75, sigmaSpace=75)
        
        # 5. Canny thresholds are GRADIENT limits, not brightness limits. The old rule derived them from
        # the median brightness (~250 on white paper -> 163/220), which discarded faint pencil strokes.
        # Use the strength of the strongest gradients in the drawing instead, with sane bounds.
        if low_threshold is None or high_threshold is None:
            roi = blurred[y_offset:y_offset + scaled_h, x_offset:x_offset + scaled_w]
            if roi.size > 0:
                gx = cv2.Sobel(roi, cv2.CV_32F, 1, 0, ksize=3)
                gy = cv2.Sobel(roi, cv2.CV_32F, 0, 1, ksize=3)
                mag = cv2.magnitude(gx, gy) / 4.0   # Sobel 3x3 gain -> back to ~0-255 contrast scale
                strong = float(np.percentile(mag, 97)) if np.any(mag > 0) else 100.0
            else:
                strong = 100.0
            high_thresh = int(min(160, max(60, 0.5 * strong)))
            low_thresh = int(max(20, 0.4 * high_thresh))
        else:
            low_thresh = low_threshold
            high_thresh = high_threshold

        edges = cv2.Canny(blurred, low_thresh, high_thresh)
        
        # 6. Morphological lineart dilation for crisp ControlNet line conditioning
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        dilated_edges = cv2.dilate(edges, kernel, iterations=1)
        
        edge_filename = f"{file_id}_edge.png"
        edge_save_path = UPLOAD_DIR / edge_filename
        cv2.imwrite(str(edge_save_path), dilated_edges)
        
        # 7. Create Architectural Blueprint Inspection Map
        # Navy blue drafting background (#0B132B) with cyan lines (#00E5FF) and coordinate grid
        blueprint = np.zeros((target_h, target_w, 3), dtype=np.uint8)
        blueprint[:] = (43, 19, 11)  # BGR for #0B132B
        
        # Architectural grid (every 64 px)
        grid_overlay = blueprint.copy()
        for x in range(0, target_w, 64):
            cv2.line(grid_overlay, (x, 0), (x, target_h), (75, 38, 22), 1)
        for y in range(0, target_h, 64):
            cv2.line(grid_overlay, (0, y), (target_w, y), (75, 38, 22), 1)
        blueprint = cv2.addWeighted(blueprint, 0.7, grid_overlay, 0.3, 0)
        
        # Paint edges in glowing cyan (BGR: 255, 229, 0)
        blueprint[dilated_edges > 0] = (255, 229, 0)
        
        bp_filename = f"{file_id}_blueprint.png"
        bp_save_path = UPLOAD_DIR / bp_filename
        cv2.imwrite(str(bp_save_path), blueprint)
        
        edge_density = float(np.sum(edges > 0) / (target_h * target_w))
        duration_ms = (time.time() - t0) * 1000
        
        result = {
            "edge_path": str(edge_save_path),
            "edge_url": f"/uploads/{edge_filename}",
            "blueprint_path": str(bp_save_path),
            "blueprint_url": f"/uploads/{bp_filename}",
            "width": target_w,
            "height": target_h,
            "aspect_ratio": aspect_str,
            "aspect_label": aspect_label,
            "original_width": orig_w,
            "original_height": orig_h,
            "content_box": [x_offset, y_offset, scaled_w, scaled_h],
            "edge_density": round(edge_density, 4),
            "low_threshold": low_thresh,
            "high_threshold": high_thresh,
            "compute_duration_ms": round(duration_ms, 2),
            "cache_hit": False
        }
        
        if file_bytes:
            global_cache.put_preproc(cache_key, result, duration_ms=duration_ms)
            
        return result
