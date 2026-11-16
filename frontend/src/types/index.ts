export type ViewTab = 'landing' | 'studio' | 'examples' | 'projects';

export type ComparisonMode = 'slider' | 'side-by-side' | 'edge-overlay';

export interface ArchitecturalProject {
  id: string;
  title: string;
  sketch_url: string;
  edge_url?: string;
  render_url: string;
  style: string;
  building_type: string;
  lighting: string;
  materials?: string;
  user_prompt?: string;
  compiled_prompt: string;
  negative_prompt?: string;
  controlnet_strength: number;
  denoising_strength: number;
  guidance_scale: number;
  seed: number;
  resolution: string;
  inference_time_sec: number;
  provider: string;
  is_demo_mode: boolean;
  is_favorite: boolean;
  model_name?: string;
  model_version?: string;
  cache_hit?: boolean;
  aspect_ratio?: string;
  created_at: string;
}

export interface ExampleCase {
  id: string;
  title: string;
  category: string;
  style: string;
  lighting: string;
  materials: string;
  user_prompt: string;
  sketch_url: string;
  render_url: string;
  controlnet_strength: number;
  denoising_strength: number;
  guidance_scale: number;
  description: string;
}

export interface PreprocessResult {
  sketch_id: string;
  filename: string;
  sketch_url: string;
  edge_url: string;
  blueprint_url: string;
  width: number;
  height: number;
  aspect_ratio?: string;
  aspect_label?: string;
  edge_density: number;
  cache_hit?: boolean;
}

/** Everything the Studio needs to reproduce a preloaded example or an earlier project. */
export interface StudioPreset {
  sketchUrl?: string;
  title?: string;
  style?: string;
  category?: string;
  lighting?: string;
  materials?: string;
  userPrompt?: string;
  controlnetStrength?: number;
  denoisingStrength?: number;
  guidanceScale?: number;
}

export interface AppConfig {
  prompt_profile?: string;
  default_provider: string;
  has_huggingface_key: boolean;
  has_replicate_token: boolean;
  has_fal_key: boolean;
  is_demo_mode: boolean;
  active_provider_label: string;
  primary_model?: string;
  primary_version?: string;
  styles: string[];
  building_types: string[];
  lighting_options: string[];
  default_negative_prompt: string;
}

export interface GenerationParams {
  sketch_id?: string;
  sketch_url?: string;
  user_prompt: string;
  style: string;
  building_type: string;
  lighting: string;
  materials: string;
  controlnet_strength: number;
  denoising_strength: number;
  guidance_scale: number;
  seed: number;
  resolution: string;
  negative_prompt?: string;
  compiled_prompt?: string;
  provider?: string;
  title?: string;
}

export interface GenerationResult {
  status: string;
  project: ArchitecturalProject;
  generation: {
    render_id: string;
    render_url: string;
    compiled_prompt: string;
    negative_prompt: string;
    style: string;
    building_type: string;
    lighting: string;
    materials: string;
    controlnet_strength: number;
    denoising_strength: number;
    guidance_scale: number;
    seed: number;
    resolution: string;
    aspect_ratio?: string;
    inference_time_sec: number;
    provider: string;
    is_demo_mode: boolean;
    model_name?: string;
    model_version?: string;
    cache_hit?: boolean;
    prompt_profile?: string;
    structure_conditioned?: boolean;
    status_message: string;
  };
}

