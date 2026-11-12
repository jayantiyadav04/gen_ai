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
│  (Ray-traced glass, lighting & landscaping)  │
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

## 6. Configuring Live Cloud GPU Diffusion

By default, CampusVision AI runs in **Authentic Procedural Demonstration Mode**, allowing complete exploration of sketch upload, OpenCV edge extraction, prompt engineering, comparison sliders, and project history without needing external credentials.

To connect live cloud GPU diffusion:
1. Open the application and click the **Settings** icon (or top-right pill).
2. Enter your free **Hugging Face Token** (from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)) or **Replicate API Token**.
3. Click **Save Settings**. The status indicator will turn green (`Live Cloud GPU Connected`).

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
- **Curated Case Studies**: 6 pre-loaded architectural benchmark transformations ready to explore and load into the Studio with one click.

