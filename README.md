# CampusVision AI — Sketch-to-Photoreal Campus Renderer

> **University Generative AI Application**  
> **Domain**: Education Facility Design & Campus Planning  
> **Technique Category**: Image-to-Image Translation with Structural Conditioning (ControlNet)

---

## 1. Project Overview

CampusVision AI is a specialized Generative AI application engineered for university planners, educational architects, and campus development committees.

Turning rough architectural sketches of new academic blocks, central libraries, laboratories, auditoriums, and campus masterplans into board-ready photorealistic visualizations traditionally requires manual 3D modeling and days of rendering time. CampusVision AI translates concept drawings into photorealistic campus visualizations in seconds while strictly preserving original elevations, column grids, and floor plates through **OpenCV edge extraction** and **ControlNet structural conditioning**.

---

## 2. System Architecture

The application implements a genuine 5-phase image-to-image Generative AI pipeline:

```
┌──────────────────────────────────────────────┐
│       User Uploads Architectural Sketch      │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│     OpenCV Preprocessing + Edge Detection    │
│  (Bilateral filter + Canny structural map)   │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│     ControlNet + Image-to-Image Diffusion    │
│  (Spatial conditioning + Architectural GenAI)│
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│          Photorealistic Campus Render        │
│  (Photorealistic render from the selected engine)  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│           Compare • Save • Download          │
│ (Split-slider, edge overlay & SQLite archive)│
└──────────────────────────────────────────────┘
```

---

## 3. Technology Stack

- **Frontend**:
  - React 18 with Vite
  - TypeScript
  - Tailwind CSS (Warm architectural palette, deep navy, and blueprint cyan accents)
  - Lucide React icons
  - Canvas Confetti
- **Backend**:
  - Python 3.13 with FastAPI
  - RESTful architecture with Pydantic v2 schemas
  - Asynchronous processing with HTTPX
- **Computer Vision & Image Processing**:
  - OpenCV (`cv2`): Bilateral line-preserving filtering, Canny edge detection, blueprint analysis map
  - NumPy: Matrix spatial conditioning
  - Pillow (`PIL`): Image validation, color grading, atmospheric bloom
- **Generative AI Engine**:
  - Multi-provider architecture supporting:
    - **Hugging Face Inference API**: `diffusers/controlnet-canny-sdxl-1.0`
    - **Replicate API**: SDXL ControlNet Canny
    - **Procedural Demonstration Engine**: Authentic offline architectural synthesis when cloud API credentials are not set
- **Database & Persistence**:
  - SQLite (`campusvision.db`) for project history, favorite designs, and user preferences

---

## 4. Quickstart Guide

### Prerequisites
- macOS (Apple Silicon or Intel), Linux, or Windows with WSL
- Python 3.10+
- Node.js 18+ and npm

### Method A: One-Command Startup (Unified Server)
To run both backend and frontend bundled on a single port (`http://localhost:8000`):

```bash
chmod +x start.sh
./start.sh
```

Then open **[http://localhost:8000](http://localhost:8000)** in your browser.
API documentation is available at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

### Method B: Development Mode (Hot Reloading)
For concurrent development with Vite HMR:

```bash
# Terminal 1: Backend
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

Then open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 5. Automated Verification Test Suite

To verify the complete backend, image processing pipeline, GenAI endpoints, and database persistence, run:

```bash
./venv/bin/python backend/test_suite.py
```

All 9 end-to-end integration tests will run:
1. `GET /api/health`
2. `GET /api/config`
3. `GET /api/examples` (6 curated university case studies)
4. `POST /api/build-prompt` (Dynamic architectural prompt compiler)
5. `POST /api/preprocess-sketch` (OpenCV Canny edge extraction & blueprint overlay)
6. `POST /api/generate` (Core Image-to-Image Generative AI pipeline)
7. `GET /api/projects` (SQLite persistence)
8. `POST /api/projects/{id}/favorite` (Interactive state management)
9. `GET /` (Frontend Single-Page Application delivery)

---

## 6. Choosing the Generation Engine

CampusVision AI supports several engines. Pick one in **Settings** (top-right pill) or with `DEFAULT_PROVIDER` in `.env`.

**Local ComfyUI (default, free):** Stable Diffusion 1.5 + ControlNet Canny running on your own computer.
1. Install ComfyUI Desktop and place `v1-5-pruned-emaonly.safetensors` (checkpoints) and `control_v11p_sd15_canny_fp16.safetensors` (controlnet) in its models folder.
2. Keep ComfyUI Desktop open. Check its port and set `COMFYUI_URL` in `.env` if it is not `http://127.0.0.1:8188`.
3. Open Settings, choose **Local ComfyUI**, and press **Check ComfyUI connection**.
4. Generate. A render takes about 1-3 minutes on a 16 GB MacBook; the first run is slower.

Local renders are concept-quality (up to 768 px). The prompt builder keeps prompts short because Stable Diffusion 1.5 only reads about 75 tokens.

**Cloud providers (optional):** enter a Hugging Face or Replicate token in Settings and select that engine.

**Demo mode:** an offline procedural simulation for exploring the interface without any AI model.

---

### 6a. Prompts are written per model

The prompt compiler (`backend/services/prompt_builder.py`) builds a different prompt for each engine:

| Engine | Profile | Prompt style |
|---|---|---|
| Local ComfyUI | `sd15` | Short comma-separated tags, about 50 words (CLIP only reads ~75 tokens) |
| Replicate / Hugging Face | `sdxl` | Richer descriptive phrases, about 70 words, photograph-style tail, extra negatives |
| Fal.ai | `sdxl_img2img` | Photo-first wording and strong "not a drawing" negatives, because the raw sketch is the init image |
| Demo | `demo` | Shown for reference only |

Command-style wording such as "Convert this sketch into..." is removed automatically: diffusion models do not follow instructions. The negative prompt follows the selected style (a Neo-Classical building no longer forbids columns). Editing the compiled prompt by hand (Manual Override) is sent to the generator; changing any option rebuilds it.

### 6b. Preloaded sketches

Clicking a preloaded benchmark sketch in the Studio loads its style, building type, lighting, materials, description and tuned ControlNet/CFG values, runs the OpenCV edge pipeline on it, and rebuilds the prompt for the active engine.

---

## 7. Key Features

- **Architectural Typologies**: University Academic Block, School Building, Central Library, Grand Auditorium, Research Laboratory, Sports Complex, Student Hostel, Campus Masterplan.
- **Architectural Styles**: Modern Minimalist, Contemporary, Neo-Classical, Sustainable / Green Biophilic, Futuristic Parametric, Traditional Indian Heritage (Indo-Saracenic), Institutional Brutalist.
- **Lighting & Atmosphere**: Crisp Morning, Golden Hour, Bright Daylight, Sunset, Evening Blue Hour, Night Illumination.
- **Interactive Verification Suite**:
  - Draggable Before-and-After split comparison slider
  - Side-by-side comparative inspection
  - Structural Edge Overlay mode (superimposes OpenCV Canny lines over the render in blueprint cyan)
  - Fullscreen zoom and pan modal
- **Curated Case Studies**: 6 pre-loaded benchmark sketches that configure the Studio with one click. The example "renders" in the gallery are procedural illustrations, not AI output; generate with a real engine for photorealistic results.

## 8. Tests

```
./venv/bin/python backend/test_suite.py                  # 9 end-to-end API tests
./venv/bin/python backend/test_prompts_and_samples.py    # per-model prompts, preloaded-sample flow, overrides
```

