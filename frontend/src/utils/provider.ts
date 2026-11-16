import { AppConfig } from '../types';

/** True when images are generated on this computer (local ComfyUI). */
export const isLocalProvider = (config?: AppConfig | null): boolean =>
  config?.default_provider === 'comfyui' || config?.default_provider === 'local';

/** Short, honest label for the engine badge shown in the navbar and studio. */
export const engineBadge = (config?: AppConfig | null): string => {
  if (config?.is_demo_mode) return 'Demo Engine';
  if (isLocalProvider(config)) return 'Local AI (ComfyUI)';
  return 'Cloud GPU';
};
