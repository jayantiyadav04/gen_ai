import os
import uuid
from pathlib import Path
from typing import Tuple, Dict, Any
import cv2
import numpy as np
from PIL import Image
from backend.config import UPLOAD_DIR, settings

class ImageProcessor:
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
        
        # Now run OpenCV edge preprocessing
        proc_result = ImageProcessor.process_sketch(str(save_path), file_id)
        
        return {
            "sketch_id": file_id,
            "filename": safe_name,
            "sketch_url": f"/uploads/{safe_name}",
            "edge_url": proc_result["edge_url"],
            "blueprint_url": proc_result["blueprint_url"],
            "width": proc_result["width"],
            "height": proc_result["height"],
            "edge_density": proc_result["edge_density"]
        }

    @staticmethod
    def process_sketch(
        image_path: str,
        file_id: str,
        low_threshold: int = 100,
        high_threshold: int = 200
    ) -> Dict[str, Any]:
        """
        Preprocesses sketch using OpenCV:
        1. Grayscale & Noise reduction (bilateral filter to preserve architectural edges)
        2. Canny Edge Detection (conditioned for ControlNet - white edges on black background)
        3. Architectural blueprint edge overlay for UI inspection
        """
        img_bgr = cv2.imread(image_path)
        if img_bgr is None:
            raise ValueError("Failed to read image with OpenCV")
            
        h, w = img_bgr.shape[:2]
        
        # Constrain dimensions to optimal aspect ratio and multiples of 64
        max_dim = 1280
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            new_w = int(w * scale // 64 * 64)
            new_h = int(h * scale // 64 * 64)
            img_bgr = cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
            h, w = img_bgr.shape[:2]
            
        # Convert to grayscale
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        # Bilateral filter smoothens textures while preserving sharp architectural lines
        blurred = cv2.bilateralFilter(gray, d=7, sigmaColor=75, sigmaSpace=75)
        
        # Invert if the drawing is dark-on-white vs white-on-dark
        mean_val = np.mean(blurred)
        if mean_val > 127:
            # Typical paper sketch: black pencil on white paper
            # Invert for morphological line analysis
            pass
            
        # Canny edge detection
        edges = cv2.Canny(blurred, low_threshold, high_threshold)
        
        # Slight dilation to ensure clean ControlNet guidance lines
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        dilated_edges = cv2.dilate(edges, kernel, iterations=1)
        
        edge_filename = f"{file_id}_edge.png"
        edge_save_path = UPLOAD_DIR / edge_filename
        cv2.imwrite(str(edge_save_path), dilated_edges)
        
        # Create Architectural Blueprint Inspection Map:
        # Dark navy background (#0B132B) with vibrant cyan lines (#00E5FF) and grid lines
        blueprint = np.zeros((h, w, 3), dtype=np.uint8)
        blueprint[:] = (43, 19, 11)  # BGR for #0B132B
        
        # Add subtle architectural coordinate grid (every 64 px)
        grid_overlay = blueprint.copy()
        for x in range(0, w, 64):
            cv2.line(grid_overlay, (x, 0), (x, h), (70, 35, 20), 1)
        for y in range(0, h, 64):
            cv2.line(grid_overlay, (0, y), (w, y), (70, 35, 20), 1)
        blueprint = cv2.addWeighted(blueprint, 0.7, grid_overlay, 0.3, 0)
        
        # Paint edges in glowing cyan (BGR: 255, 229, 0)
        blueprint[dilated_edges > 0] = (255, 229, 0)
        
        bp_filename = f"{file_id}_blueprint.png"
        bp_save_path = UPLOAD_DIR / bp_filename
        cv2.imwrite(str(bp_save_path), blueprint)
        
        edge_density = float(np.sum(edges > 0) / (h * w))
        
        return {
            "edge_path": str(edge_save_path),
            "edge_url": f"/uploads/{edge_filename}",
            "blueprint_url": f"/uploads/{bp_filename}",
            "width": w,
            "height": h,
            "edge_density": round(edge_density, 4)
        }

