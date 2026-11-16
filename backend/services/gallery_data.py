import os
import math
import zlib
import random
from pathlib import Path
from typing import Dict, Any, List, Tuple
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np
import cv2
from backend.config import SAMPLES_DIR

EXAMPLES = [
    {
        "id": "ex-academic-block",
        "title": "Faculty of Sciences & Academic Complex",
        "university": "University Central Campus Expansion",
        "category": "University Building",
        "style": "Modern Minimalist",
        "lighting": "Morning",
        "materials": "Low-iron structural glass curtain walls, fair-faced white concrete, slender steel fins",
        "user_prompt": "modern university academic block, continuous ribbon glass windows, landscaped sunken courtyard, fair-faced concrete louvers",
        "sketch_file": "academic_block_sketch.png",
        "render_file": "academic_block_render.png",
        "controlnet_strength": 0.85,
        "denoising_strength": 0.70,
        "guidance_scale": 8.0,
        "description": "Multi-tier academic pavilion transformed from pencil concept sketch to photorealistic morning visualization."
    },
    {
        "id": "ex-central-library",
        "title": "Central University Library & Digital Commons",
        "university": "Sir Christopher Wren Memorial Campus",
        "category": "Library",
        "style": "Contemporary",
        "lighting": "Golden Hour",
        "materials": "Acoustic curtain glazing, Accoya vertical timber louvers, dark anthracite zinc fascia",
        "user_prompt": "contemporary university library, double-height glazed reading atrium, warm wooden fins, students on the plaza",
        "sketch_file": "central_library_sketch.png",
        "render_file": "central_library_render.png",
        "controlnet_strength": 0.82,
        "denoising_strength": 0.72,
        "guidance_scale": 7.5,
        "description": "Grand university library with soaring glazed atrium and warm wooden louvers in golden hour light."
    },
    {
        "id": "ex-biotech-hub",
        "title": "Institute for Bio-Engineering & Quantum Labs",
        "university": "Advanced Technology Research Park",
        "category": "Research Laboratory",
        "style": "Sustainable / Green Architecture",
        "lighting": "Bright Daylight",
        "materials": "Cross-laminated mass timber (CLT), vertical hydroponic living walls, photovoltaic glass canopy",
        "user_prompt": "sustainable research laboratory, multi-tier vertical garden facades, solar canopy, large glazed lab wings, planted bioswales",
        "sketch_file": "biotech_hub_sketch.png",
        "render_file": "biotech_hub_render.png",
        "controlnet_strength": 0.88,
        "denoising_strength": 0.68,
        "guidance_scale": 8.5,
        "description": "LEED Platinum biophilic research hub with living green walls and solar canopy in bright daylight."
    },
    {
        "id": "ex-auditorium",
        "title": "Grand Convocation Auditorium & Symphony Hall",
        "university": "University Arts & Cultural Precinct",
        "category": "Auditorium",
        "style": "Futuristic Parametric",
        "lighting": "Evening",
        "materials": "Tessellated champagne titanium panels, curved structural glass foyer, warm LED interior illumination",
        "user_prompt": "university auditorium with fluid curving roofline, glowing entrance foyer, illuminated campus walkways",
        "sketch_file": "auditorium_sketch.png",
        "render_file": "auditorium_render.png",
        "controlnet_strength": 0.85,
        "denoising_strength": 0.75,
        "guidance_scale": 9.0,
        "description": "Parametric convocation hall with fluid titanium canopy and glowing interior at blue hour dusk."
    },
    {
        "id": "ex-heritage-hall",
        "title": "Heritage Faculty Quadrangle & Residence",
        "university": "Historic Campus Core",
        "category": "Student Hostel",
        "style": "Traditional Indian Heritage",
        "lighting": "Sunset",
        "materials": "Chisel-dressed Agra red sandstone, hand-carved Dholpur buff stone, geometric jali sunscreens",
        "user_prompt": "heritage university building, carved sandstone jali screens, shaded colonnades, arched veranda, central courtyard",
        "sketch_file": "heritage_hall_sketch.png",
        "render_file": "heritage_hall_render.png",
        "controlnet_strength": 0.80,
        "denoising_strength": 0.70,
        "guidance_scale": 7.5,
        "description": "Collegiate heritage faculty building featuring carved sandstone arches and sunset warmth."
    },
    {
        "id": "ex-sports-arena",
        "title": "University Olympic Athletics & Aquatic Center",
        "university": "Varsity Sports Complex",
        "category": "Sports Complex",
        "style": "Contemporary",
        "lighting": "Bright Daylight",
        "materials": "Lightweight PTFE tensile membrane canopy, architectural fair-faced concrete, frameless structural glass",
        "user_prompt": "university athletics and aquatic center, sweeping curved roof canopy, glass pavilion, running track and sports fields",
        "sketch_file": "sports_arena_sketch.png",
        "render_file": "sports_arena_render.png",
        "controlnet_strength": 0.84,
        "denoising_strength": 0.72,
        "guidance_scale": 8.0,
        "description": "High-tech university athletic arena with sweeping tensile membrane canopy and landscaped grounds."
    }
]

def init_sample_assets():
    """Generates human-grade architectural sketches and photorealistic renders for the example gallery."""
    sketch_dir = SAMPLES_DIR / "sketches"
    render_dir = SAMPLES_DIR / "renders"
    sketch_dir.mkdir(parents=True, exist_ok=True)
    render_dir.mkdir(parents=True, exist_ok=True)

    W, H = 1280, 800

    for ex in EXAMPLES:
        sk_path = sketch_dir / ex["sketch_file"]
        rd_path = render_dir / ex["render_file"]
        
        # Only (re)create missing files, so committed/edited samples are never overwritten on startup
        if not sk_path.exists():
            _render_architectural_hand_sketch(str(sk_path), ex, W, H)
        if not rd_path.exists():
            _render_photorealistic_visualization(str(rd_path), ex, W, H)

def _render_architectural_hand_sketch(path: str, ex: Dict[str, Any], w: int, h: int):
    """
    Renders an authentic, hand-drawn architectural concept drafting sketch on vellum paper,
    with technical dimensions, overlapping pencil strokes, elevation annotations, and architectural scale.
    """
    # 1. Warm vellum drafting paper base with subtle paper fiber texture
    np.random.seed(zlib.crc32(ex["id"].encode()) % 10000)  # stable across runs (hash() is randomised per process)
    base_paper = np.ones((h, w, 3), dtype=np.uint8) * 247
    base_paper[:, :, 0] += np.random.randint(0, 5, (h, w), dtype=np.uint8) # slight warm cream tint
    base_paper[:, :, 1] += np.random.randint(0, 3, (h, w), dtype=np.uint8)
    
    img = Image.fromarray(base_paper)
    draw = ImageDraw.Draw(img)
    
    # 2. Subtle architectural drafting grid (pale blueprint grid lines)
    for x in range(0, w, 40):
        draw.line([(x, 0), (x, h)], fill=(234, 230, 220), width=1)
    for y in range(0, h, 40):
        draw.line([(0, y), (w, y)], fill=(234, 230, 220), width=1)
        
    pencil = (38, 42, 50)
    pencil_soft = (75, 82, 95)
    pencil_dim = (120, 130, 145)
    pencil_hatch = (160, 170, 185)

    def draw_sketch_line(pt1, pt2, width=2, overshoot=12):
        """Draws a human architectural pencil line with natural overshoots at corners."""
        x1, y1 = pt1
        x2, y2 = pt2
        angle = math.atan2(y2 - y1, x2 - x1)
        # Add slight natural jitter
        ox1 = x1 - math.cos(angle) * overshoot + random.uniform(-1, 1)
        oy1 = y1 - math.sin(angle) * overshoot + random.uniform(-1, 1)
        ox2 = x2 + math.cos(angle) * overshoot + random.uniform(-1, 1)
        oy2 = y2 + math.sin(angle) * overshoot + random.uniform(-1, 1)
        draw.line([(ox1, oy1), (ox2, oy2)], fill=pencil, width=width)
        # Double pencil pass for hand-drawn character
        draw.line([(x1 + random.uniform(-0.5, 0.5), y1 + random.uniform(-0.5, 0.5)),
                   (x2 + random.uniform(-0.5, 0.5), y2 + random.uniform(-0.5, 0.5))], fill=pencil_soft, width=1)

    # Ground line & baseline
    horizon_y = int(h * 0.74)
    by1 = int(h * 0.26)
    draw_sketch_line((-20, horizon_y), (w + 20, horizon_y), width=3, overshoot=0)
    draw_sketch_line((-20, horizon_y + 4), (w + 20, horizon_y + 4), width=1, overshoot=0)
    
    category = ex["category"]
    
    # 3. Main Architectural Geometry depending on typology
    if category in ["University Building", "Research Laboratory"]:
        # Modern 3-tier stepped massing with cantilever
        bx1, by1, bx2, by2 = int(w * 0.14), int(h * 0.26), int(w * 0.86), horizon_y
        
        # Main building outline
        draw_sketch_line((bx1, by1), (bx2, by1), width=3)
        draw_sketch_line((bx1, by1), (bx1, by2), width=3)
        draw_sketch_line((bx2, by1), (bx2, by2), width=3)
        
        # Cantilevered upper story volume
        cx1, cy1, cx2, cy2 = int(w * 0.24), int(h * 0.16), int(w * 0.76), int(h * 0.40)
        draw_sketch_line((cx1, cy1), (cx2, cy1), width=2)
        draw_sketch_line((cx1, cy1), (cx1, cy2), width=2)
        draw_sketch_line((cx2, cy1), (cx2, cy2), width=2)
        draw_sketch_line((cx1, cy2), (cx2, cy2), width=2)
        
        # Fenestration ribbon grid
        num_floors = 4
        floor_h = (by2 - by1) // num_floors
        num_bays = 10
        bay_w = (bx2 - bx1) // num_bays
        
        for f in range(num_floors):
            fy = by1 + f * floor_h
            draw_sketch_line((bx1, fy), (bx2, fy), width=2, overshoot=8)
            for b in range(num_bays):
                bx = bx1 + b * bay_w
                draw.line([(bx, fy), (bx, fy + floor_h)], fill=pencil_soft, width=1)
                # Diagonal glass cross-hatching
                for hx in range(10, bay_w - 6, 12):
                    draw.line([(bx + hx, fy + 8), (bx + hx + 14, fy + floor_h - 8)], fill=pencil_hatch, width=1)
                    
        # Grand entrance canopy & steps
        ent_w = int(w * 0.28)
        ex1 = (w - ent_w) // 2
        ex2 = ex1 + ent_w
        draw_sketch_line((ex1, int(h * 0.62)), (ex2, int(h * 0.62)), width=3)
        draw_sketch_line((ex1, int(h * 0.62)), (ex1, horizon_y), width=3)
        draw_sketch_line((ex2, int(h * 0.62)), (ex2, horizon_y), width=3)
        for s in range(5):
            sy = horizon_y - s * 5
            draw.line([(ex1 - s * 10, sy), (ex2 + s * 10, sy)], fill=pencil_soft, width=2)

    elif category == "Library":
        # Monumental central atrium with soaring glass curtain facade & reading pavilions
        bx1, by1, bx2, by2 = int(w * 0.12), int(h * 0.22), int(w * 0.88), horizon_y
        draw_sketch_line((bx1, by1), (bx2, by1), width=3)
        draw_sketch_line((bx1, by1), (bx1, by2), width=3)
        draw_sketch_line((bx2, by1), (bx2, by2), width=3)
        
        # Central vaulted glass atrium
        ax1, ax2 = int(w * 0.36), int(w * 0.64)
        draw.arc([ax1, int(h * 0.12), ax2, int(h * 0.32)], 180, 0, fill=pencil, width=3)
        draw_sketch_line((ax1, int(h * 0.22)), (ax1, horizon_y), width=3)
        draw_sketch_line((ax2, int(h * 0.22)), (ax2, horizon_y), width=3)
        
        # Vertical solar louvers
        for lx in range(ax1 + 12, ax2, 14):
            draw.line([(lx, int(h * 0.24)), (lx, horizon_y)], fill=pencil_soft, width=1)
            
        # Classical colonnade pilasters
        for col_x in [bx1 + 45, bx1 + 105, bx1 + 165, bx2 - 165, bx2 - 105, bx2 - 45]:
            draw_sketch_line((col_x, by1), (col_x, horizon_y), width=2, overshoot=4)
            draw.line([(col_x - 12, by1), (col_x + 12, by1)], fill=pencil, width=3)
            
    elif category == "Auditorium":
        # Aerodynamic sweeping curved roofline
        pts = [
            (int(w * 0.08), horizon_y),
            (int(w * 0.18), int(h * 0.38)),
            (int(w * 0.44), int(h * 0.16)),
            (int(w * 0.82), int(h * 0.24)),
            (int(w * 0.92), horizon_y)
        ]
        for i in range(len(pts) - 1):
            draw_sketch_line(pts[i], pts[i+1], width=4)
            
        # Glazed grand entrance foyer beneath canopy
        draw_sketch_line((int(w * 0.22), int(h * 0.36)), (int(w * 0.78), int(h * 0.32)), width=2)
        for fx in range(int(w * 0.24), int(w * 0.76), 28):
            draw.line([(fx, int(h * 0.35)), (fx, horizon_y)], fill=pencil_soft, width=1)
            # Glass reflection strokes
            draw.line([(fx + 8, int(h * 0.40)), (fx + 22, horizon_y - 20)], fill=pencil_hatch, width=1)

    elif category == "Sports Complex":
        # Tensile membrane roof with masts
        pts = [
            (int(w * 0.06), horizon_y),
            (int(w * 0.26), int(h * 0.18)),
            (int(w * 0.50), int(h * 0.30)),
            (int(w * 0.74), int(h * 0.16)),
            (int(w * 0.94), horizon_y)
        ]
        for i in range(len(pts) - 1):
            draw_sketch_line(pts[i], pts[i+1], width=4)
            
        for mast_x in [int(w * 0.26), int(w * 0.74)]:
            draw_sketch_line((mast_x, int(h * 0.10)), (mast_x, horizon_y), width=3, overshoot=10)
            # Stay cables
            draw.line([(mast_x, int(h * 0.10)), (int(w * 0.06), horizon_y)], fill=pencil_dim, width=1)
            draw.line([(mast_x, int(h * 0.10)), (int(w * 0.50), int(h * 0.30))], fill=pencil_dim, width=1)
            draw.line([(mast_x, int(h * 0.10)), (int(w * 0.94), horizon_y)], fill=pencil_dim, width=1)
            
    else:
        # Traditional Indian Heritage (Sandstone Jali & Colonnaded Arches)
        bx1, by1, bx2, by2 = int(w * 0.12), int(h * 0.24), int(w * 0.88), horizon_y
        draw_sketch_line((bx1, by1), (bx2, by1), width=3)
        draw_sketch_line((bx1, by1), (bx1, by2), width=3)
        draw_sketch_line((bx2, by1), (bx2, by2), width=3)
        
        # Heritage Dome / Chhatri pavilion
        dcx, dcy = w // 2, int(h * 0.16)
        draw.arc([dcx - 70, dcy - 50, dcx + 70, dcy + 50], 180, 0, fill=pencil, width=3)
        draw.line([(dcx, dcy - 50), (dcx, dcy - 75)], fill=pencil, width=2) # Kalash finial
        
        # Row of Cusped Heritage Arches
        num_arches = 7
        arch_w = (bx2 - bx1) // num_arches
        for a in range(num_arches):
            ax1 = bx1 + a * arch_w
            ax2 = ax1 + arch_w
            draw.arc([ax1 + 8, int(h * 0.42), ax2 - 8, int(h * 0.56)], 180, 0, fill=pencil, width=2)
            draw_sketch_line((ax1 + 8, int(h * 0.49)), (ax1 + 8, horizon_y), width=2)
            draw_sketch_line((ax2 - 8, int(h * 0.49)), (ax2 - 8, horizon_y), width=2)
            # Intricate Jali grid inside arches
            for jx in range(ax1 + 14, ax2 - 8, 8):
                draw.line([(jx, int(h * 0.46)), (jx, int(h * 0.52))], fill=pencil_dim, width=1)

    # 4. Technical Architectural Title Block & Dimension Lines (Essential for professional presentation)
    # Dimension leader line at top
    dim_y = int(h * 0.08)
    draw.line([(int(w * 0.12), dim_y), (int(w * 0.88), dim_y)], fill=pencil_dim, width=1)
    draw.line([(int(w * 0.12), dim_y - 6), (int(w * 0.12), dim_y + 6)], fill=pencil, width=2)
    draw.line([(int(w * 0.88), dim_y - 6), (int(w * 0.88), dim_y + 6)], fill=pencil, width=2)
    draw.line([(w // 2, dim_y - 4), (w // 2, dim_y + 4)], fill=pencil_dim, width=1)
    
    # Elevation level markers
    draw.line([(int(w * 0.06), by1), (int(w * 0.11), by1)], fill=pencil_dim, width=1)
    draw.line([(int(w * 0.06), horizon_y), (int(w * 0.11), horizon_y)], fill=pencil_dim, width=1)

    # Architectural scale human figures (scale indicator)
    for fig_x in [int(w * 0.48), int(w * 0.52)]:
        # Minimalist human silhouette sketch
        head_y = horizon_y - 28
        draw.ellipse([fig_x - 3, head_y - 6, fig_x + 3, head_y], fill=pencil_soft)
        draw.line([(fig_x, head_y), (fig_x, horizon_y)], fill=pencil_soft, width=2)
        draw.line([(fig_x - 4, head_y + 8), (fig_x + 4, head_y + 8)], fill=pencil_soft, width=1)

    # Natural sketchy landscape trees flanking elevation
    for tx in [int(w * 0.06), int(w * 0.94)]:
        draw_sketch_line((tx, horizon_y), (tx, int(h * 0.50)), width=2)
        # Scribble foliage cloud
        for a in range(0, 360, 45):
            rad = math.radians(a)
            cx = tx + int(math.cos(rad) * 35) + random.randint(-5, 5)
            cy = int(h * 0.44) + int(math.sin(rad) * 35) + random.randint(-5, 5)
            draw.arc([cx - 20, cy - 20, cx + 20, cy + 20], 0, 360, fill=pencil_dim, width=1)

    # Save sketch
    img.save(path, "PNG", quality=95)

def _render_photorealistic_visualization(path: str, ex: Dict[str, Any], w: int, h: int):
    """
    Renders a stunning, master-level architectural visualization adhering to the geometric structural layout,
    complete with realistic lighting, glass reflections, materials, landscaping, and campus atmosphere.
    """
    lighting = ex["lighting"]
    category = ex["category"]
    style = ex["style"]
    
    # 1. Sky & Atmospheric gradient
    sky_gradients = {
        "Morning": ((210, 230, 248), (242, 248, 255)),
        "Golden Hour": ((245, 175, 105), (255, 230, 195)),
        "Bright Daylight": ((135, 192, 245), (218, 238, 255)),
        "Sunset": ((180, 80, 110), (250, 160, 95)),
        "Evening": ((24, 44, 84), (54, 84, 136)),
        "Night": ((10, 16, 35), (20, 32, 60))
    }
    top_c, bot_c = sky_gradients.get(lighting, sky_gradients["Morning"])
    
    horizon_y = int(h * 0.74)
    canvas = np.zeros((h, w, 3), dtype=np.uint8)
    
    # Create smooth atmospheric sky gradient
    for y in range(horizon_y):
        t = y / max(1, horizon_y)
        r = int(top_c[0] * (1 - t) + bot_c[0] * t)
        g = int(top_c[1] * (1 - t) + bot_c[1] * t)
        b = int(top_c[2] * (1 - t) + bot_c[2] * t)
        canvas[y, :] = (b, g, r) # OpenCV BGR
        
    # Add subtle soft clouds to the sky
    np.random.seed(42)
    cloud_layer = np.zeros((horizon_y, w), dtype=np.float32)
    for _ in range(8):
        cx = np.random.randint(50, w - 50)
        cy = np.random.randint(30, int(horizon_y * 0.6))
        rw = np.random.randint(120, 280)
        rh = np.random.randint(25, 60)
        cv2.ellipse(cloud_layer, (cx, cy), (rw, rh), 0, 0, 360, 0.15, -1)
    cloud_layer = cv2.GaussianBlur(cloud_layer, (101, 31), 0)
    
    for y in range(horizon_y):
        alpha = cloud_layer[y, :]
        for c in range(3):
            canvas[y, :, c] = np.clip(canvas[y, :, c] + alpha * 180, 0, 255).astype(np.uint8)

    # 2. Campus Landscape Ground (Manicured lawns & granite-paved pedestrian plaza)
    lawn_bgr = (45, 115, 50) if lighting not in ["Evening", "Night"] else (22, 45, 28)
    plaza_bgr = (195, 195, 200) if lighting not in ["Evening", "Night"] else (65, 70, 80)
    
    for y in range(horizon_y, h):
        canvas[y, :] = lawn_bgr
        
    # Central entrance plaza promenade with slight perspective taper
    promenade = np.array([
        [int(w * 0.25), horizon_y],
        [int(w * 0.75), horizon_y],
        [int(w * 0.90), h],
        [int(w * 0.10), h]
    ], np.int32)
    cv2.fillPoly(canvas, [promenade], plaza_bgr)
    
    # Granite paving joints
    for py in range(horizon_y + 12, h, 28):
        cv2.line(canvas, (0, py), (w, py), (160, 160, 165), 1)

    # 3. Main Architectural Structure (Matches geometric coordinates of the sketch!)
    if category in ["University Building", "Research Laboratory"]:
        bx1, by1, bx2, by2 = int(w * 0.14), int(h * 0.26), int(w * 0.86), horizon_y
        
        # Facade concrete panel with warm architectural tone
        concrete_c = (215, 220, 225) if "Green" not in style else (175, 190, 175)
        cv2.rectangle(canvas, (bx1, by1), (bx2, by2), concrete_c, -1)
        
        # Cantilevered upper story
        cx1, cy1, cx2, cy2 = int(w * 0.24), int(h * 0.16), int(w * 0.76), int(h * 0.40)
        cv2.rectangle(canvas, (cx1, cy1), (cx2, cy2), (235, 238, 242), -1)
        # Deep soft cantilever drop shadow
        shadow_poly = np.array([
            [cx1, cy2],
            [cx2, cy2],
            [cx2, cy2 + 24],
            [cx1, cy2 + 24]
        ], np.int32)
        cv2.fillPoly(canvas, [shadow_poly], (90, 95, 105))
        
        # Curtain glass window bays
        num_floors = 4
        num_bays = 10
        floor_h = (by2 - by1) // num_floors
        bay_w = (bx2 - bx1) // num_bays
        
        for f in range(num_floors):
            fy = by1 + f * floor_h + 8
            for b in range(num_bays):
                bx = bx1 + b * bay_w + 6
                # Realistic glass reflection: sky blue + interior incandescent light
                if lighting in ["Evening", "Night"]:
                    glass_c = (140, 215, 255) # Warm glowing gold/amber
                elif lighting == "Golden Hour":
                    glass_c = (170, 205, 245)
                else:
                    glass_c = (215, 185, 135) # Cool sky reflection
                cv2.rectangle(canvas, (bx, fy), (bx + bay_w - 12, fy + floor_h - 16), glass_c, -1)
                # Slender dark window frame
                cv2.rectangle(canvas, (bx, fy), (bx + bay_w - 12, fy + floor_h - 16), (50, 55, 65), 2)
                # Diagonal glass highlight reflection
                cv2.line(canvas, (bx + 8, fy + 6), (bx + bay_w - 18, fy + floor_h - 22), (255, 255, 255), 2)
                
        # Grand entrance canopy & glass foyer
        ent_w = int(w * 0.28)
        ex1 = (w - ent_w) // 2
        ex2 = ex1 + ent_w
        cv2.rectangle(canvas, (ex1, int(h * 0.62)), (ex2, horizon_y), (35, 40, 48), 3)
        cv2.rectangle(canvas, (ex1 + 4, int(h * 0.63)), (ex2 - 4, horizon_y), (220, 205, 165), -1)

    elif category == "Library":
        bx1, by1, bx2, by2 = int(w * 0.12), int(h * 0.22), int(w * 0.88), horizon_y
        cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (218, 218, 215), -1)
        
        # Central vaulted glass atrium
        ax1, ax2 = int(w * 0.36), int(w * 0.64)
        cv2.ellipse(canvas, (w // 2, int(h * 0.23)), ((ax2 - ax1) // 2, int(h * 0.11)), 0, 180, 360, (235, 205, 155), -1)
        cv2.rectangle(canvas, (ax1, int(h * 0.23)), (ax2, horizon_y), (225, 195, 145), -1)
        
        # Architectural timber louvers
        for lx in range(ax1 + 10, ax2, 14):
            cv2.line(canvas, (lx, int(h * 0.24)), (lx, horizon_y), (45, 85, 140), 3) # Accoya warm wood
            
        # Flanking classical pilasters
        for col_x in [bx1 + 45, bx1 + 105, bx1 + 165, bx2 - 165, bx2 - 105, bx2 - 45]:
            cv2.rectangle(canvas, (col_x - 12, by1), (col_x + 12, horizon_y), (238, 238, 235), -1)
            cv2.rectangle(canvas, (col_x - 12, by1), (col_x + 12, horizon_y), (145, 145, 145), 1)

    elif category == "Auditorium":
        # Dynamic sweeping curved roofline
        pts = np.array([
            [int(w * 0.08), horizon_y],
            [int(w * 0.18), int(h * 0.38)],
            [int(w * 0.44), int(h * 0.16)],
            [int(w * 0.82), int(h * 0.24)],
            [int(w * 0.92), horizon_y]
        ], np.int32)
        cv2.fillPoly(canvas, [pts], (185, 190, 202)) # Champagne titanium metal
        cv2.polylines(canvas, [pts], False, (65, 70, 80), 3)
        
        # Glowing glass foyer beneath
        foyer_pts = np.array([
            [int(w * 0.22), horizon_y],
            [int(w * 0.25), int(h * 0.38)],
            [int(w * 0.75), int(h * 0.34)],
            [int(w * 0.78), horizon_y]
        ], np.int32)
        cv2.fillPoly(canvas, [foyer_pts], (140, 215, 255) if lighting in ["Evening", "Night"] else (225, 205, 170))

    elif category == "Sports Complex":
        pts = np.array([
            [int(w * 0.06), horizon_y],
            [int(w * 0.26), int(h * 0.18)],
            [int(w * 0.50), int(h * 0.30)],
            [int(w * 0.74), int(h * 0.16)],
            [int(w * 0.94), horizon_y]
        ], np.int32)
        cv2.fillPoly(canvas, [pts], (242, 246, 250))
        cv2.polylines(canvas, [pts], False, (85, 95, 105), 3)
        for mast_x in [int(w * 0.26), int(w * 0.74)]:
            cv2.line(canvas, (mast_x, int(h * 0.10)), (mast_x, horizon_y), (75, 80, 90), 4)
            cv2.line(canvas, (mast_x, int(h * 0.10)), (int(w * 0.06), horizon_y), (140, 145, 155), 2)
            cv2.line(canvas, (mast_x, int(h * 0.10)), (int(w * 0.50), int(h * 0.30)), (140, 145, 155), 2)
    else:
        # Heritage Sandstone
        bx1, by1, bx2, by2 = int(w * 0.12), int(h * 0.24), int(w * 0.88), horizon_y
        cv2.rectangle(canvas, (bx1, by1), (bx2, by2), (80, 105, 175), -1) # Agra Red Sandstone
        dcx, dcy = w // 2, int(h * 0.16)
        cv2.ellipse(canvas, (dcx, dcy), (70, 45), 0, 180, 360, (140, 185, 220), -1)
        num_arches = 7
        arch_w = (bx2 - bx1) // num_arches
        for a in range(num_arches):
            ax1 = bx1 + a * arch_w
            ax2 = ax1 + arch_w
            cv2.ellipse(canvas, ((ax1 + ax2)//2, int(h * 0.49)), (arch_w // 2 - 4, 32), 0, 180, 360, (50, 75, 140), -1)
            cv2.rectangle(canvas, (ax1 + 8, int(h * 0.49)), (ax2 - 8, horizon_y), (40, 60, 110), -1)

    # 4. Landscaping: Mature campus shade trees & natural scale figures
    for tx, radius, col in [
        (int(w * 0.07), 54, (45, 110, 52)),
        (int(w * 0.93), 58, (38, 98, 44)),
        (int(w * 0.19), 38, (52, 128, 62)),
        (int(w * 0.81), 42, (48, 122, 58))
    ]:
        cv2.line(canvas, (tx, horizon_y), (tx, horizon_y - radius * 2), (38, 52, 70), 5)
        cv2.circle(canvas, (tx, horizon_y - radius * 2 + 12), radius, col, -1)
        # Highlight on sunlit leaf crown
        cv2.circle(canvas, (tx - 12, horizon_y - radius * 2 + 2), radius // 2, (col[0]+28, col[1]+32, col[2]+20), -1)

    # Convert to PIL for optical depth bloom and tone-mapping
    rgb_img = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb_img)
    
    # Subtle atmospheric lens bloom
    bloom = pil_img.filter(ImageFilter.GaussianBlur(radius=8))
    pil_img = Image.blend(pil_img, bloom, 0.14)
    
    pil_img.save(path, "PNG", quality=95)
