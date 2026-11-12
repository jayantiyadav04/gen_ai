from typing import Dict, Any, List

ARCHITECTURAL_STYLES: Dict[str, Dict[str, str]] = {
    "Modern Minimalist": {
        "description": "Clean horizontal lines, floor-to-ceiling glass curtain walls, smooth fair-faced concrete, minimalist cantilevered canopies",
        "keywords": "modern minimalist architecture, Mies van der Rohe inspired, pure geometric volumes, expansive low-iron glass facades, refined concrete panels, slender steel structural columns"
    },
    "Contemporary": {
        "description": "Dynamic angled geometry, mixed timber and zinc cladding, double-height atriums, articulated solar louvers",
        "keywords": "contemporary educational architecture, dynamic volumetric facade, dark zinc panels, warm Accoya wood fins, open glazed atrium, architectural brise-soleil"
    },
    "Neo-Classical": {
        "description": "Colonnaded portico, grand pediment, symmetry, carved sandstone capitals, classical university collegiate aesthetic",
        "keywords": "neo-classical university building, monumental stone colonnade, fluted ionic columns, carved limestone frieze, symmetrical campus facade, stately academic hall"
    },
    "Sustainable / Green Architecture": {
        "description": "Biophilic living green walls, rooftop solar pergola, timber mass-construction, natural rainwater harvesting bioswales",
        "keywords": "sustainable biophilic campus architecture, LEED Platinum certified design, lush vertical living walls, cross-laminated timber (CLT) structure, photovoltaic glass canopy, native landscape bioswales"
    },
    "Futuristic Parametric": {
        "description": "Fluid aerodynamic curves, parametric tessellated glass shell, titanium composite panels, illuminated sky-bridges",
        "keywords": "futuristic parametric campus architecture, Zaha Hadid inspired fluid curvature, organic sweeping canopy, triangular tessellated glass envelope, structural exoskeleton, illuminated bridge walkways"
    },
    "Traditional Indian Heritage": {
        "description": "Indo-Saracenic and regional heritage elements: intricate sandstone jali screens, chhatri pavilions, shaded courtyards, deep verandas",
        "keywords": "Indo-Saracenic university campus architecture, red Agra sandstone, buff Dholpur stone carvings, geometric jali sunscreens, open haveli courtyards, shaded stepped colonnades"
    },
    "Institutional Brutalist": {
        "description": "Monumental textured board-marked concrete, deep recessed fenestration, geometric sun-shades, exposed brick masonry",
        "keywords": "institutional monumental architecture, Louis Kahn inspired, rich red exposed brick masonry, board-formed architectural concrete, deep recessed geometric window apertures, dramatic light wells"
    }
}

BUILDING_TYPES: Dict[str, Dict[str, str]] = {
    "University Building": {
        "description": "Multi-story academic complex with lecture wings, administrative offices, and landscaped courtyard",
        "keywords": "university academic building, lecture hall complex, faculty offices, central gathering plaza, modern university campus"
    },
    "School Building": {
        "description": "Welcoming educational facility with wide shaded corridors, learning clusters, and safe play commons",
        "keywords": "contemporary educational school building, bright airy classrooms, wide covered verandas, landscaped schoolyard"
    },
    "Library": {
        "description": "Monumental university central library with multi-tier glass reading atriums, book stacks, and quiet study terraces",
        "keywords": "grand university central library, soaring multi-story glass atrium, interior warm wooden bookshelves visible through curtain wall, quiet reading terraces, monumental knowledge center"
    },
    "Auditorium": {
        "description": "State-of-the-art campus convocation auditorium, acoustic shell design, dramatic entrance canopy, illuminated foyer",
        "keywords": "university convocation hall and auditorium, grand ceremonial entrance, sweeping curved acoustic roofline, glowing glazed grand foyer, campus event center"
    },
    "Research Laboratory": {
        "description": "High-tech interdisciplinary science and technology facility with cleanroom glazing, vibration-isolated wings, and service pods",
        "keywords": "interdisciplinary scientific research institute, clean high-tech facade, solar-controlled laboratory glazing, advanced academic technology center"
    },
    "Sports Complex": {
        "description": "Olympic-standard university athletics pavilion, curved tensile roof, indoor arena, glass-enclosed fitness center overlooking fields",
        "keywords": "university sports pavilion and athletic complex, soaring tensile membrane roof, glazed gymnasium facade, landscaped running tracks and athletic grounds"
    },
    "Student Hostel": {
        "description": "Residential collegiate village with private student balconies, shared social commons, dining hall, and central lawn",
        "keywords": "modern university student residential hall, student dormitory commons, modular facade with private sun-shaded balconies, landscaped courtyard gardens"
    },
    "Complete Campus Layout": {
        "description": "Master-planned university campus bird's-eye and perspective view, pedestrian boulevards, water features, central quadrangle",
        "keywords": "comprehensive university campus masterplan, aerial architectural perspective, interconnected pedestrian walkways, manicured central quads, fountain plaza, cohesive institutional design"
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

DEFAULT_NEGATIVE_PROMPT = (
    "rough sketch, pencil lines, ballpoint lines, blueprint grid, draft drawing, "
    "cartoon, 3D CGI toy, low-poly rendering, warped architecture, crooked columns, "
    "melting facade, floating roof, impossible non-euclidean geometry, broken glass, "
    "unrealistic proportions, duplicate buildings, blurry, noisy, low resolution, "
    "watermark, signature, text, amateur rendering, oversaturated neon, overexposed blown out whites"
)

class PromptBuilder:
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
        
        # 1. Structural conditioning directive
        prompt_parts.append(
            "Photorealistic architectural photograph of a university campus facility, "
            "strictly matching the geometric layout and elevation contours of the architectural sketch"
        )
        
        # 2. Building Category & Identity
        prompt_parts.append(f"{bldg_info['keywords']}")
        
        # 3. Architectural Style & Aesthetic
        prompt_parts.append(f"{style_info['keywords']}")
        
        # 4. Specific Materials & Textures
        if materials.strip():
            prompt_parts.append(f"facade constructed with {materials.strip()}")
            
        # 5. User's specific vision & instructions
        if user_prompt.strip():
            prompt_parts.append(f"features: {user_prompt.strip()}")
            
        # 6. Lighting & Atmosphere
        prompt_parts.append(f"{light_info['keywords']}")
        
        # 7. Environment & Campus Life Context
        prompt_parts.append(
            "surrounded by manicured university green lawns, mature deciduous shade trees, "
            "stone-paved pedestrian boulevards, university students and faculty walking naturally in the distance"
        )
        
        # 8. Photographic Quality & Render Standard
        prompt_parts.append(
            "professional architectural photography, shot on Hasselblad H6D-100c, "
            "24mm tilt-shift lens with straight vertical perspective, ray-traced ambient occlusion, "
            "physically-based glass reflections, ultra-high definition, 8k resolution, ArchDaily editorial showcase"
        )
        
        compiled_prompt = ", ".join(prompt_parts)
        
        return {
            "compiled_prompt": compiled_prompt,
            "negative_prompt": DEFAULT_NEGATIVE_PROMPT,
            "style_summary": style_info["description"],
            "building_summary": bldg_info["description"],
            "lighting_summary": light_info["description"]
        }

