import { AppConfig } from '../types';

/** Resolve Auto using the same cloud priority as the backend; otherwise use local ComfyUI. */
export const effectiveProvider = (config?: AppConfig | null): string => {
  const selected = (config?.default_provider || 'comfyui').toLowerCase();
  if (selected !== 'auto') return selected;
  if (config?.has_replicate_token) return 'replicate';
  if (config?.has_huggingface_key) return 'huggingface';
  if (config?.has_fal_key) return 'fal';
  return 'comfyui';
};

/** True when images are generated on this computer (local ComfyUI). */
export const isLocalProvider = (config?: AppConfig | null): boolean =>
  ['comfyui', 'local'].includes(effectiveProvider(config));

/** Short, honest label for the engine badge shown in the navbar and studio. */
export const engineBadge = (config?: AppConfig | null): string => {
  const provider = effectiveProvider(config);
  if (provider === 'demo') return 'Demo Engine';
  if (provider === 'comfyui' || provider === 'local') return 'Local AI (ComfyUI)';
  if (provider === 'replicate') return 'Replicate';
  if (provider === 'huggingface' || provider === 'hf') return 'Hugging Face';
  if (provider === 'fal' || provider === 'fal_ai') return 'Fal.ai';
  return 'AI Engine';
};
