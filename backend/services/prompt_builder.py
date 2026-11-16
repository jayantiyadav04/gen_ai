import re
from typing import Dict, Any, List, Optional

ARCHITECTURAL_STYLES: Dict[str, Dict[str, Any]] = {
    "Modern Minimalist": {
        "description": "Clean horizontal lines, floor-to-ceiling glass curtain walls, smooth fair-faced concrete, minimalist cantilevered canopies",
        "keywords": (
            "modern minimalist architecture, Mies van der Rohe aesthetic, pure geometric volumes, "
            "expansive low-iron glass facades with slender aluminum mullions, refined fair-faced concrete panels, "
            "cantilevered entrance canopies, seamless indoor-outdoor transition, uncluttered spatial purity"
        ),
        "materials": "thermal insulated structural glass, fair-faced architectural concrete, brushed stainless steel, light granite pavers",
        "negative_bias": "ornate moldings, classical pediments, rustic brickwork, baroque columns, chaotic clutter"
    },
    "Contemporary": {
        "description": "Dynamic angled geometry, mixed timber and zinc cladding, double-height atriums, articulated solar louvers",
        "keywords": (
            "contemporary university educational architecture, dynamic volumetric facade composition, "
            "dark anthracite zinc standing-seam panels, warm Accoya timber slat cladding, double-height glazed atrium, "
            "kinetic architectural brise-soleil, articulated sunshades, bold geometric roof articulation"
        ),
        "materials": "anthracite zinc cladding, vertical warm cedar wood fins, floor-to-ceiling curtain walls, polished terrazzo",
        "negative_bias": "antiquated columns, gothic arches, dilapidated surfaces, crumbling masonry"
    },
    "Neo-Classical": {
        "description": "Colonnaded portico, grand pediment, symmetry, carved sandstone capitals, classical university collegiate aesthetic",
        "keywords": (
            "neo-classical collegiate university architecture, monumental fluted ionic stone colonnade, "
            "symmetrical academic palace elevation, carved Indiana limestone frieze, grand entry pediment, "
            "formal architectural proportion, stately scholastic dignity"
        ),
        "materials": "honed Indiana limestone, buff sandstone, fluted marble columns, bronze-framed double-hung windows, slate roof tiles",
        "negative_bias": "hyper-modern glass pods, brutalist raw concrete, futuristic neon, organic fluid blobs"
    },
    "Sustainable / Green Architecture": {
        "description": "Biophilic living green walls, rooftop solar pergola, timber mass-construction, natural rainwater harvesting bioswales",
        "keywords": (
            "sustainable biophilic campus architecture, LEED Platinum net-zero certified academic hub, "
            "multi-tiered vertical living green walls, cross-laminated mass timber (CLT) framing, "
            "photovoltaic solar roof pergola, native landscape bioswales, passive natural ventilation louvers"
        ),
        "materials": "cross-laminated timber (CLT), glulam beams, living sedum green roof, low-carbon bio-concrete, high-performance solar glass",
        "negative_bias": "sterile industrial surfaces, smoke, heavy polluted concrete, windowless monolithic walls"
    },
    "Futuristic Parametric": {
        "description": "Fluid aerodynamic curves, parametric tessellated glass shell, titanium composite panels, illuminated sky-bridges",
        "keywords": (
            "futuristic parametric university facility, Zaha Hadid inspired fluid curvature, "
            "continuous organic sweeping roof envelope, triangular diagrid tessellated glass facade, "
            "lightweight white titanium composite shell, elevated illuminated transparent sky-bridge"
        ),
        "materials": "white titanium zinc panels, curved structural double-glazed units, structural steel diagrid exoskeleton, seamless solid surface corian",
        "negative_bias": "rigid rectangular boxes, classical columns, brick cottages, historic stonework"
    },
    "Traditional Indian Heritage": {
        "description": "Indo-Saracenic and regional heritage elements: intricate sandstone jali screens, chhatri pavilions, shaded courtyards, deep verandas",
        "keywords": (
            "Indo-Saracenic university campus architecture, warm red Agra sandstone cladding, "
            "intricate geometric stone jali sunscreens filtering daylight, graceful chhatri corner pavilions, "
            "deep shaded stepped colonnades, open haveli courtyard with central marble fountain"
        ),
        "materials": "Agra red sandstone, Dholpur beige sandstone, carved jali screens, Kota stone flooring, polished brass accents",
        "negative_bias": "cold grey brutalist concrete, futuristic sci-fi glass pods, bare curtain walls without shading"
    },
    "Institutional Brutalist": {
        "description": "Monumental textured board-marked concrete, deep recessed fenestration, geometric sun-shades, exposed brick masonry",
        "keywords": (
            "institutional monumental architecture, Louis Kahn inspired, rich red exposed wire-cut brick masonry, "
            "board-formed architectural concrete with visible wood-grain texture, deep recessed geometric window apertures, "
            "dramatic circular light wells, timeless academic gravitas"
        ),
        "materials": "board-formed raw concrete, wire-cut architectural red brick, weathered bronze window trim, honed dark basalt flooring",
        "negative_bias": "fragile all-glass curtain wall, shiny plastic panels, cartoonish colors, ornamental classical scrollwork"
    }
}

BUILDING_TYPES: Dict[str, Dict[str, str]] = {
    "University Building": {
        "description": "Multi-story academic complex with lecture wings, administrative offices, and landscaped courtyard",
        "keywords": "university academic building, smart lecture hall complex, faculty office pavilion, central gathering quadrangle"
    },
    "School Building": {
        "description": "Welcoming educational facility with wide shaded corridors, learning clusters, and safe play commons",
        "keywords": "contemporary educational school building, naturally lit classrooms, wide covered verandas, landscaped courtyard commons"
    },
    "Library": {
        "description": "Monumental university central library with multi-tier glass reading atriums, book stacks, and quiet study terraces",
        "keywords": "grand university central library, soaring multi-story glass reading atrium, interior warm wooden bookshelves visible through glass, quiet study terraces"
    },
    "Auditorium": {
        "description": "State-of-the-art campus convocation auditorium, acoustic shell design, dramatic entrance canopy, illuminated foyer",
        "keywords": "university convocation hall and auditorium, grand ceremonial entrance, sweeping acoustic roofline, glowing glazed grand foyer"
    },
    "Research Laboratory": {
        "description": "High-tech interdisciplinary science and technology facility with cleanroom glazing, vibration-isolated wings, and service pods",
        "keywords": "interdisciplinary scientific research institute, clean high-tech facade, solar-controlled laboratory glazing, advanced academic technology center"
    },
    "Sports Complex": {
        "description": "Olympic-standard university athletics pavilion, curved tensile roof, indoor arena, glass-enclosed fitness center overlooking fields",
        "keywords": "university sports pavilion and athletic complex, soaring tensile membrane roof, glazed gymnasium facade, landscaped running tracks"
    },
    "Student Hostel": {
        "description": "Residential collegiate village with private student balconies, shared social commons, dining hall, and central lawn",
        "keywords": "modern university student residential hall, student dormitory commons, modular facade with private sun-shaded balconies, landscaped courtyard gardens"
    },
    "Complete Campus Layout": {
        "description": "Master-planned university campus bird's-eye and perspective view, pedestrian boulevards, water features, central quadrangle",
        "keywords": "comprehensive university campus masterplan, aerial architectural perspective, interconnected pedestrian walkways, manicured central quads, fountain plaza"
    }
}

LIGHTING_CONDITIONS: Dict[str, Dict[str, str]] = {
    "Morning": {
        "description": "Crisp morning sunlight, soft cool shadows, fresh atmosphere",
        "keywords": "crisp morning architectural sunlight, low angle golden-white morning rays, long soft shadows, crystal clear blue sky, fresh morning mist on lawns"
    },
    "Golden Hour": {
        "description": "Warm amber glow, dramatic low-angle rays, glowing facade highlights",
        "keywords": "dramatic architectural golden hour, warm amber sun low on the horizon, glowing glass facade reflections, warm orange-gold light cast on stone and concrete"
    },
    "Bright Daylight": {
        "description": "High noon clear architectural sunlight, sharp crisp shadows, high contrast",
        "keywords": "bright clear daylight, architectural midday illumination, vivid natural colors, realistic glass transparency and sky reflections, sharp clean shadows"
    },
    "Sunset": {
        "description": "Vivid magenta and warm ochre horizon, early twilight ambient glow",
        "keywords": "vibrant sunset sky, warm crimson and purple gradient atmosphere, warm dusk light reflecting on glazed surfaces, ambient architectural glow"
    },
    "Evening": {
        "description": "Blue hour dusk, deep cobalt sky, interior warm lights glowing through glass curtain walls",
        "keywords": "architectural blue hour dusk, deep twilight cobalt sky, warm interior lighting glowing through floor-to-ceiling glass curtain walls, glowing exterior bollard lighting"
    },
    "Night": {
        "description": "Architectural exterior uplighting, illuminated campus pathways, star-filled night sky",
        "keywords": "dramatic night architectural visualization, precision facade uplighting, illuminated campus walkways and plazas, interior ambient warmth, clear starry night"
    }
}

BASE_NEGATIVE_PROMPT = (
    "rough sketch, hand-drawn lines, pencil hatch marks, ballpoint pen lines, blueprint grid, draft wireframe, "
    "blurry, noisy, low resolution, 3D CGI toy, low-poly rendering, warped architecture, crooked structural columns, "
    "floating roof, non-euclidean impossible geometry, shattered glass, broken facades, deformed windows, "
    "watermark, signature, text, amateur rendering, oversaturated neon, overexposed blown-out highlights, "
    "unnatural perspective, fisheye distortion"
)

DEFAULT_NEGATIVE_PROMPT = BASE_NEGATIVE_PROMPT

class PromptBuilder:
    @staticmethod
    def expand_user_description(text: str) -> str:
        """
        Intelligently expands simple user descriptions into rich architectural terminology
        while strictly preserving the user's intended building layout and features.
        """
        if not text or not text.strip():
            return ""
            
        cleaned = text.strip()
        expansions = []
        
        # Check for glass/windows
        if re.search(r"\b(glass|glazing|window|transparent)\b", cleaned, re.IGNORECASE):
            expansions.append("floor-to-ceiling high-performance structural glass curtain walls with low-iron transparency and thermal breaks")
            
        # Check for concrete/walls
        if re.search(r"\b(concrete|cement|wall|facade)\b", cleaned, re.IGNORECASE):
            expansions.append("smooth architectural fair-faced concrete with crisp formwork tie-holes and micro-textured surfaces")
            
        # Check for timber/wood
        if re.search(r"\b(wood|timber|slat|fin)\b", cleaned, re.IGNORECASE):
            expansions.append("vertical engineered timber louvers and warm natural wood soffit panels providing passive solar shading")
            
        # Check for greenery/plants/landscape
        if re.search(r"\b(green|greenery|tree|garden|landscape|lawn|plant)\b", cleaned, re.IGNORECASE):
            expansions.append("curated campus landscape architecture with permeable stone plazas, mature shade trees, and drought-tolerant groundcover")
            
        # Check for roof/canopy/entrance
        if re.search(r"\b(roof|canopy|entrance|plaza|door)\b", cleaned, re.IGNORECASE):
            expansions.append("cantilevered architectural canopy defining a dignified entrance foyer and welcoming pedestrian threshold")

        expanded_details = ", ".join(expansions)
        if expanded_details:
            return f"{cleaned} ({expanded_details})"
        return cleaned

    @staticmethod
    def build_prompt(
        user_prompt: str,
        style: str = "Modern Minimalist",
        building_type: str = "University Building",
        lighting: str = "Morning",
        materials: str = "Structural glass curtain walls, fair-faced concrete, timber accents"
    ) -> Dict[str, str]:
        """
        Constructs an intelligent, multi-layer architectural prompt optimized
        for structural preservation and photorealistic rendering.
        """
        style_info = ARCHITECTURAL_STYLES.get(style, ARCHITECTURAL_STYLES["Modern Minimalist"])
        bldg_info = BUILDING_TYPES.get(building_type, BUILDING_TYPES["University Building"])
        light_info = LIGHTING_CONDITIONS.get(lighting, LIGHTING_CONDITIONS["Morning"])
        
        prompt_parts: List[str] = []
        
        # 1. Structural conditioning directive (matches sketch layout strictly)
        prompt_parts.append(
            "Photorealistic architectural photograph of a university campus facility, "
            "strictly preserving the structural boundaries, floor elevations, and geometry of the conditioning sketch"
        )
        
        # 2. Building Category & Typology Identity
        prompt_parts.append(f"{bldg_info['keywords']}")
        
        # 3. Architectural Style & Virtual LoRA Conditioning
        prompt_parts.append(f"{style_info['keywords']}")
        
        # 4. Material Specification (Defaults to style materials if not specified)
        effective_materials = materials.strip() if materials and materials.strip() else style_info.get("materials", "")
        if effective_materials:
            prompt_parts.append(f"facade articulated with {effective_materials}")
            
        # 5. User's Vision with Intelligent Architectural Expansion
        expanded_user = PromptBuilder.expand_user_description(user_prompt)
        if expanded_user:
            prompt_parts.append(f"architectural requirements: {expanded_user}")
            
        # 6. Natural Lighting Atmosphere
        prompt_parts.append(f"{light_info['keywords']}")
        
        # 7. Campus Landscape & Context
        prompt_parts.append(
            "surrounded by manicured university green lawns, mature deciduous shade trees, "
            "stone-paved pedestrian boulevards, university students and faculty walking naturally in the distance"
        )
        
        # 8. Photographic Standards & Optical Realism
        prompt_parts.append(
            "professional architectural photography, shot on Hasselblad H6D-100c, "
            "24mm tilt-shift lens with perfectly vertical perspective lines, ray-traced ambient occlusion, "
            "physically-based glass reflections, ultra-high definition, 8k resolution, ArchDaily editorial showcase"
        )
        
        compiled_prompt = ", ".join(prompt_parts)
        
        # Synthesize tailored style-specific negative prompt
        style_neg = style_info.get("negative_bias", "")
        negative_prompt = f"{BASE_NEGATIVE_PROMPT}, {style_neg}" if style_neg else BASE_NEGATIVE_PROMPT
        
        return {
            "compiled_prompt": compiled_prompt,
            "negative_prompt": negative_prompt,
            "style_summary": style_info["description"],
            "building_summary": bldg_info["description"],
            "lighting_summary": light_info["description"]
        }
