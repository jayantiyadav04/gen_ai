"""
Model-aware prompt builder for CampusVision AI.

Each generation engine reads text differently, so the prompt is compiled per "profile":
  sd15         Local ComfyUI, Stable Diffusion 1.5 + ControlNet Canny (CLIP, ~75 tokens, comma tags)
  sdxl         Replicate / Hugging Face, SDXL + ControlNet Canny (two text encoders, richer phrases)
  sdxl_img2img Fal.ai SDXL image-to-image (the raw sketch is the init image, so the prompt must
               explicitly ask for a photograph instead of a drawing)
  demo         Offline procedural engine (prompt is only displayed, not read by a model)

Original notes (SD 1.5 profile):

Why prompts are short and plain:
- SD 1.5 reads text through CLIP, which only sees ~75 tokens at a time. Anything past that
  dilutes the important words, so the compiled prompt is kept compact (subject first).
- The model does not understand camera bodies, ray-tracing or "preserve the sketch" instructions.
  Structure comes from the ControlNet edge map, so the prompt only describes WHAT to draw
  (building type, style, materials, light) and the quality of the image.
- The wording asks for a clean architectural visualization / concept render, which is
  what this model can deliver, instead of an impossible "8k Hasselblad photograph".
"""
import re
from typing import Dict, Any, List, Optional

ARCHITECTURAL_STYLES: Dict[str, Dict[str, Any]] = {
    "Modern Minimalist": {
        "description": "Clean horizontal lines, floor-to-ceiling glass curtain walls, smooth fair-faced concrete, minimalist cantilevered canopies",
        "keywords": "modern minimalist architecture, glass curtain wall, thin aluminium frames, smooth concrete panels, flat roof",
        "materials": "glass, smooth concrete, steel, light stone paving",
        "negative_bias": "ornate decoration, classical columns, brick, rustic",
    },
    "Contemporary": {
        "description": "Dynamic angled geometry, mixed timber and zinc cladding, double-height atriums, articulated solar louvers",
        "keywords": "contemporary architecture, timber slat cladding, dark metal panels, large glass atrium, sun shading fins",
        "materials": "dark zinc panels, wood slats, glass, terrazzo",
        "negative_bias": "gothic arches, old crumbling walls, classical columns",
    },
    "Neo-Classical": {
        "description": "Colonnaded portico, grand pediment, symmetry, carved sandstone capitals, classical university collegiate aesthetic",
        "keywords": "neoclassical architecture, stone columns, triangular pediment, symmetrical facade, tall arched windows",
        "materials": "limestone, sandstone, marble columns, slate roof",
        "negative_bias": "glass boxes, brutalist concrete, futuristic shapes",
    },
    "Sustainable / Green Architecture": {
        "description": "Biophilic living green walls, rooftop solar pergola, timber mass-construction, natural rainwater harvesting bioswales",
        "keywords": "sustainable biophilic architecture, cross-laminated timber structure, green wall, rooftop solar panels, plants on terraces",
        "materials": "cross-laminated timber, wood beams, green roof, solar glass",
        "negative_bias": "smoke, industrial walls, windowless concrete",
    },
    "Futuristic Parametric": {
        "description": "Fluid aerodynamic curves, parametric tessellated glass shell, titanium composite panels, illuminated sky-bridges",
        "keywords": "futuristic parametric architecture, curved white roof, flowing organic shape, diagrid glass facade",
        "materials": "white curved panels, glass, steel diagrid",
        "negative_bias": "plain box shape, classical columns, brick",
    },
    "Traditional Indian Heritage": {
        "description": "Indo-Saracenic and regional heritage elements: intricate sandstone jali screens, chhatri pavilions, shaded courtyards, deep verandas",
        "keywords": "Indo-Saracenic architecture, red sandstone facade, stone jali screens, chhatri domes, arched veranda",
        "materials": "red sandstone, carved stone screens, Kota stone floor",
        "negative_bias": "glass curtain wall, futuristic shapes, grey concrete",
    },
    "Institutional Brutalist": {
        "description": "Monumental textured board-marked concrete, deep recessed fenestration, geometric sun-shades, exposed brick masonry",
        "keywords": "brutalist institutional architecture, board-formed concrete, red brick, deep recessed windows, geometric massing",
        "materials": "raw concrete, red brick, dark window frames",
        "negative_bias": "all-glass facade, shiny plastic, ornament, bright cartoon colors",
    },
}

BUILDING_TYPES: Dict[str, Dict[str, str]] = {
    "University Building": {
        "description": "Multi-story academic complex with lecture wings, administrative offices, and landscaped courtyard",
        "keywords": "university academic building",
    },
    "School Building": {
        "description": "Welcoming educational facility with wide shaded corridors, learning clusters, and safe play commons",
        "keywords": "school building with covered corridors",
    },
    "Library": {
        "description": "Monumental university central library with multi-tier glass reading atriums, book stacks, and quiet study terraces",
        "keywords": "university library building, large glass reading atrium",
    },
    "Auditorium": {
        "description": "State-of-the-art campus convocation auditorium, acoustic shell design, dramatic entrance canopy, illuminated foyer",
        "keywords": "university auditorium, grand entrance canopy",
    },
    "Research Laboratory": {
        "description": "High-tech interdisciplinary science and technology facility with cleanroom glazing, vibration-isolated wings, and service pods",
        "keywords": "science research laboratory building",
    },
    "Sports Complex": {
        "description": "Olympic-standard university athletics pavilion, curved tensile roof, indoor arena, glass-enclosed fitness center overlooking fields",
        "keywords": "university sports complex, large curved roof",
    },
    "Student Hostel": {
        "description": "Residential collegiate village with private student balconies, shared social commons, dining hall, and central lawn",
        "keywords": "student hostel building with balconies",
    },
    "Complete Campus Layout": {
        "description": "Master-planned university campus bird's-eye and perspective view, pedestrian boulevards, water features, central quadrangle",
        "keywords": "university campus masterplan, aerial view, several buildings, walking paths",
    },
}

LIGHTING_CONDITIONS: Dict[str, Dict[str, str]] = {
    "Morning": {
        "description": "Crisp morning sunlight, soft cool shadows, fresh atmosphere",
        "keywords": "morning sunlight, soft shadows, clear blue sky",
    },
    "Golden Hour": {
        "description": "Warm amber glow, dramatic low-angle rays, glowing facade highlights",
        "keywords": "golden hour, warm sunset light, long shadows",
    },
    "Bright Daylight": {
        "description": "High noon clear architectural sunlight, sharp crisp shadows, high contrast",
        "keywords": "bright daylight, clear blue sky, sharp shadows",
    },
    "Sunset": {
        "description": "Vivid magenta and warm ochre horizon, early twilight ambient glow",
        "keywords": "sunset sky, orange and purple clouds, warm light",
    },
    "Evening": {
        "description": "Blue hour dusk, deep cobalt sky, interior warm lights glowing through glass curtain walls",
        "keywords": "blue hour dusk, warm lights glowing inside the windows",
    },
    "Night": {
        "description": "Architectural exterior uplighting, illuminated campus pathways, star-filled night sky",
        "keywords": "night scene, lit facade, glowing windows, dark sky",
    },
}

# Short negative prompt: SD 1.5 handles a handful of strong terms better than a long list.
BASE_NEGATIVE_PROMPT = (
    "sketch, drawing, pencil lines, blueprint, lowres, blurry, distorted building, warped lines, "
    "deformed windows, floating parts, text, watermark, cartoon, oversaturated"
)

DEFAULT_NEGATIVE_PROMPT = BASE_NEGATIVE_PROMPT

# The studio form pre-fills these generic materials. Treat them as "not chosen" so each style
# uses its own materials (otherwise a Neo-Classical building would be asked for glass curtain walls).
GENERIC_DEFAULT_MATERIALS = {
    "structural glass curtain walls, fair-faced concrete, timber accents",
    "structural glass, fair-faced concrete, timber accents",
}

# Rough budget so the important words stay inside CLIP's first 75-token window.
MAX_PROMPT_WORDS = 52
MAX_USER_CHARS = 160
MAX_MATERIAL_CHARS = 90


# ----------------------------------------------------------------------------------------
# Per-model profiles
# ----------------------------------------------------------------------------------------
PROFILE_BY_PROVIDER = {
    "comfyui": "sd15", "local": "sd15",
    "replicate": "sdxl", "huggingface": "sdxl", "hf": "sdxl",
    "fal": "sdxl_img2img", "fal_ai": "sdxl_img2img",
    "demo": "demo",
}

PROFILE_LABELS = {
    "sd15": "Stable Diffusion 1.5 + ControlNet (short tag prompt, ~52 words)",
    "sdxl": "SDXL + ControlNet (descriptive prompt, ~70 words)",
    "sdxl_img2img": "SDXL image-to-image (photo-first prompt, ~70 words)",
    "demo": "Demo engine (prompt is not read by a model)",
}

PROFILE_RULES = {
    "sd15": {"max_words": 52, "tail": "realistic, sharp focus, high detail",
             "subject": "architectural visualization of a {bldg}", "natural": False},
    "sdxl": {"max_words": 70,
             "tail": "photorealistic architectural photograph, professional lighting, sharp focus, high detail, 8k",
             "subject": "professional architectural photograph of a {bldg}", "natural": True},
    "sdxl_img2img": {"max_words": 70,
                     "tail": "real photograph, photorealistic, realistic materials, sharp focus, high detail",
                     "subject": "photograph of a real, built {bldg}", "natural": True},
    "demo": {"max_words": 70, "tail": "realistic, sharp focus, high detail",
             "subject": "architectural visualization of a {bldg}", "natural": False},
}

# Extra negative terms per profile (img2img starts from the drawing, so push away from "drawing" harder)
PROFILE_NEGATIVE_EXTRA = {
    "sd15": "",
    "sdxl": "low quality, jpeg artifacts, extra floors, duplicated building, people in the foreground",
    "sdxl_img2img": "line art, hand drawn, paper texture, monochrome, grayscale, illustration, low quality",
    "demo": "",
}

# Instruction-style openings such as "Convert rough elevation sketch into ..." are meaningless to
# diffusion models (and "sketch"/"convert" even pull the result toward a drawing), so they are removed.
_INSTRUCTION_PREFIX = re.compile(
    r"^\s*(please\s+)?(convert|transform|turn|translate|render|change|make)\s+"
    r"(this\s+|the\s+|my\s+)?(rough\s+|hand[- ]drawn\s+|concept\s+|pencil\s+)*"
    r"(elevation\s+|library\s+|building\s+|campus\s+)?(sketch|drawing|elevation|concept)\s*"
    r"(into|to|as|in)?\s+(an?\s+|the\s+)?",
    re.IGNORECASE,
)


def profile_for_provider(provider: Optional[str]) -> str:
    return PROFILE_BY_PROVIDER.get((provider or "").lower().strip(), "sd15")


class PromptBuilder:
    @staticmethod
    def expand_user_description(text: str) -> str:
        """
        Adds a few short, model-friendly hints for common words in the user's description.
        The user's own wording is always kept first and unchanged.
        """
        if not text or not text.strip():
            return ""

        cleaned = re.sub(r"\s+", " ", text.strip())
        hints: List[str] = []

        if re.search(r"\b(glass|glazing|window|transparent)\b", cleaned, re.IGNORECASE):
            hints.append("glass curtain wall")
        if re.search(r"\b(concrete|cement|wall|facade)\b", cleaned, re.IGNORECASE):
            hints.append("smooth concrete facade")
        if re.search(r"\b(wood|timber|slat|fin)\b", cleaned, re.IGNORECASE):
            hints.append("wooden fins")
        if re.search(r"\b(green|greenery|tree|garden|landscape|lawn|plant)\b", cleaned, re.IGNORECASE):
            hints.append("trees and green lawn")
        if re.search(r"\b(roof|canopy|entrance|plaza|door)\b", cleaned, re.IGNORECASE):
            hints.append("covered entrance")

        if hints:
            return f"{cleaned} ({', '.join(hints)})"
        return cleaned

    @staticmethod
    def _clip(text: str, limit: int) -> str:
        text = re.sub(r"\s+", " ", (text or "").strip())
        if len(text) <= limit:
            return text
        cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:. ")
        return cut

    @staticmethod
    def clean_user_text(text: str) -> str:
        """Removes command-style wording ("Convert this sketch into ...") that diffusion models cannot follow."""
        cleaned = re.sub(r"\s+", " ", (text or "").strip())
        cleaned = _INSTRUCTION_PREFIX.sub("", cleaned).strip()
        return cleaned[:1].upper() + cleaned[1:] if cleaned else ""

    @staticmethod
    def build_prompt(
        user_prompt: str,
        style: str = "Modern Minimalist",
        building_type: str = "University Building",
        lighting: str = "Morning",
        materials: str = "Structural glass curtain walls, fair-faced concrete, timber accents",
        profile: str = "sd15",
    ) -> Dict[str, str]:
        """
        Builds the prompt for one model profile (see PROFILE_RULES).
        Subject first, then style, the user's own details, light, quality tail; materials and
        landscape are only added if the word budget allows.
        """
        rules = PROFILE_RULES.get(profile, PROFILE_RULES["sd15"])
        profile = profile if profile in PROFILE_RULES else "sd15"
        style_info = ARCHITECTURAL_STYLES.get(style, ARCHITECTURAL_STYLES["Modern Minimalist"])
        bldg_info = BUILDING_TYPES.get(building_type, BUILDING_TYPES["University Building"])
        light_info = LIGHTING_CONDITIONS.get(lighting, LIGHTING_CONDITIONS["Morning"])

        user_limit = MAX_USER_CHARS if profile == "sd15" else 260
        user_text = PromptBuilder._clip(PromptBuilder.clean_user_text(user_prompt), user_limit)
        user_text = PromptBuilder.expand_user_description(user_text) if user_text else ""
        material_text = PromptBuilder._clip(materials, MAX_MATERIAL_CHARS)
        if not material_text or material_text.lower() in GENERIC_DEFAULT_MATERIALS:
            material_text = style_info["materials"]

        # SDXL-style models read richer phrases, so use the long lighting description there
        light_text = light_info["description"] if rules["natural"] else light_info["keywords"]
        landscape = ("landscaped campus grounds with mature trees, paved plaza and walkways"
                     if rules["natural"] else "green lawn, trees, paved walkway")

        # (text, required) in priority order
        parts = [
            (rules["subject"].format(bldg=bldg_info["keywords"]), True),
            (style_info["keywords"], True),
            (user_text, True),
            (light_text, True),
            (rules["tail"], True),
            (f"made of {material_text}", False),
            (landscape, False),
        ]

        chosen: List[str] = []
        words = 0
        for text, required in parts:
            if not text:
                continue
            n = len(text.split())
            if required or words + n <= rules["max_words"]:
                chosen.append(text)
                words += n

        compiled_prompt = ", ".join(chosen)

        negative_parts = [BASE_NEGATIVE_PROMPT, style_info.get("negative_bias", ""), PROFILE_NEGATIVE_EXTRA.get(profile, "")]
        negative_prompt = ", ".join(p for p in negative_parts if p)

        return {
            "compiled_prompt": compiled_prompt,
            "negative_prompt": negative_prompt,
            "style_summary": style_info["description"],
            "building_summary": bldg_info["description"],
            "lighting_summary": light_info["description"],
            "prompt_profile": profile,
            "prompt_profile_label": PROFILE_LABELS[profile],
        }
