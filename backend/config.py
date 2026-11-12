import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
GENERATED_DIR = BASE_DIR / "generated"
SAMPLES_DIR = BASE_DIR / "samples"
DB_PATH = BASE_DIR / "campusvision.db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
(SAMPLES_DIR / "sketches").mkdir(parents=True, exist_ok=True)
(SAMPLES_DIR / "renders").mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    app_name: str = "CampusVision AI"
    version: str = "1.0.0"
    description: str = "Sketch-to-Photoreal Campus Architectural Renderer"
    
    # API Keys (loaded from environment or updated via settings endpoint)
    huggingface_api_key: str = os.getenv("HUGGINGFACE_API_KEY", "")
    replicate_api_token: str = os.getenv("REPLICATE_API_TOKEN", "")
    fal_key: str = os.getenv("FAL_KEY", "")
    
    # Provider selection: 'auto' | 'huggingface' | 'replicate' | 'fal' | 'demo'
    default_provider: str = os.getenv("DEFAULT_PROVIDER", "auto")
    
    # Allowed image formats & max size
    allowed_extensions: list[str] = [".png", ".jpg", ".jpeg", ".webp"]
    max_upload_size_mb: int = 20

settings = Settings()

