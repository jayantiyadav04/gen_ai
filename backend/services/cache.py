import os
import json
import time
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("campusvision.cache")

# Bump whenever the preprocessing algorithm changes, otherwise old edge maps are served from cache.
PREPROC_VERSION = "v3-gradient-canny"

class CampusVisionCache:
    """
    High-performance deterministic caching system for CampusVision AI.
    Caches:
    1. Preprocessing outputs (OpenCV CLAHE, bilateral filtering, Canny edges, blueprints)
    2. Prompt compilations
    3. Identical generation artifacts for fixed seeds & identical conditioning parameters
    """
    def __init__(self, cache_dir: Optional[Path] = None, max_entries: int = 500):
        self.cache_dir = cache_dir or (Path(__file__).resolve().parent.parent / "cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.max_entries = max_entries
        self.memory_index: Dict[str, Dict[str, Any]] = {}
        self.stats = {
            "hits": 0,
            "misses": 0,
            "preproc_hits": 0,
            "gen_hits": 0,
            "bytes_saved": 0,
            "time_saved_ms": 0.0
        }
        self._load_index()

    def _load_index(self):
        index_file = self.cache_dir / "index.json"
        if index_file.exists():
            try:
                with open(index_file, "r", encoding="utf-8") as f:
                    self.memory_index = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache index: {e}")
                self.memory_index = {}

    def _save_index(self):
        index_file = self.cache_dir / "index.json"
        try:
            with open(index_file, "w", encoding="utf-8") as f:
                json.dump(self.memory_index, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to write cache index: {e}")

    @staticmethod
    def hash_bytes(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def hash_preproc(image_bytes: bytes, low_threshold: Optional[int], high_threshold: Optional[int], aspect_ratio_bucket: str) -> str:
        h = hashlib.sha256(image_bytes)
        h.update(f":{low_threshold}:{high_threshold}:{aspect_ratio_bucket}:{PREPROC_VERSION}".encode("utf-8"))
        return f"preproc_{h.hexdigest()}"

    @staticmethod
    def hash_generation(
        edge_bytes: bytes,
        compiled_prompt: str,
        negative_prompt: str,
        controlnet_strength: float,
        guidance_scale: float,
        seed: int,
        resolution: str,
        model_version: str
    ) -> str:
        h = hashlib.sha256(edge_bytes)
        components = [
            compiled_prompt.strip(),
            negative_prompt.strip(),
            f"{controlnet_strength:.2f}",
            f"{guidance_scale:.2f}",
            str(seed),
            resolution,
            model_version
        ]
        h.update((":".join(components)).encode("utf-8"))
        return f"gen_{h.hexdigest()}"

    def get_preproc(self, cache_key: str) -> Optional[Dict[str, Any]]:
        record = self.memory_index.get(cache_key)
        if not record:
            self.stats["misses"] += 1
            return None
        
        # Verify files still exist on disk
        edge_path = Path(record.get("edge_path", ""))
        bp_path = Path(record.get("blueprint_path", ""))
        if edge_path.exists() and bp_path.exists():
            self.stats["hits"] += 1
            self.stats["preproc_hits"] += 1
            self.stats["time_saved_ms"] += record.get("compute_duration_ms", 120.0)
            return record
        
        # Stale cache entry
        del self.memory_index[cache_key]
        self.stats["misses"] += 1
        return None

    def put_preproc(self, cache_key: str, data: Dict[str, Any], duration_ms: float = 0.0):
        entry = {
            **data,
            "created_at": time.time(),
            "compute_duration_ms": duration_ms
        }
        self.memory_index[cache_key] = entry
        self._prune_if_needed()
        self._save_index()

    def get_generation(self, cache_key: str) -> Optional[Dict[str, Any]]:
        record = self.memory_index.get(cache_key)
        if not record:
            self.stats["misses"] += 1
            return None
        
        render_path = Path(record.get("render_path", ""))
        if render_path.exists():
            self.stats["hits"] += 1
            self.stats["gen_hits"] += 1
            self.stats["time_saved_ms"] += record.get("inference_time_sec", 15.0) * 1000
            return record
            
        del self.memory_index[cache_key]
        self.stats["misses"] += 1
        return None

    def put_generation(self, cache_key: str, data: Dict[str, Any]):
        entry = {
            **data,
            "created_at": time.time()
        }
        self.memory_index[cache_key] = entry
        self._prune_if_needed()
        self._save_index()

    def _prune_if_needed(self):
        if len(self.memory_index) > self.max_entries:
            # Sort by created_at ascending and remove oldest 20%
            sorted_keys = sorted(self.memory_index.keys(), key=lambda k: self.memory_index[k].get("created_at", 0))
            to_remove = sorted_keys[: len(sorted_keys) // 5]
            for k in to_remove:
                del self.memory_index[k]

    def clear(self):
        self.memory_index = {}
        self.stats = {
            "hits": 0,
            "misses": 0,
            "preproc_hits": 0,
            "gen_hits": 0,
            "bytes_saved": 0,
            "time_saved_ms": 0.0
        }
        self._save_index()

    def get_stats(self) -> Dict[str, Any]:
        total = self.stats["hits"] + self.stats["misses"]
        hit_ratio = round((self.stats["hits"] / total) * 100, 1) if total > 0 else 0.0
        return {
            "total_requests": total,
            "cache_hits": self.stats["hits"],
            "cache_misses": self.stats["misses"],
            "hit_ratio_percent": hit_ratio,
            "preprocessing_hits": self.stats["preproc_hits"],
            "generation_hits": self.stats["gen_hits"],
            "estimated_time_saved_seconds": round(self.stats["time_saved_ms"] / 1000, 2),
            "cached_entries_count": len(self.memory_index)
        }

# Global singleton cache instance
global_cache = CampusVisionCache()

