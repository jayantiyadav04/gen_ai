import { AppConfig, ArchitecturalProject, ExampleCase, GenerationParams, GenerationResult, PreprocessResult } from '../types';

const API_BASE = '/api';

export async function getConfig(): Promise<AppConfig> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to load configuration');
  return res.json();
}

export async function updateConfig(data: {
  huggingface_api_key?: string;
  replicate_api_token?: string;
  fal_key?: string;
  default_provider?: string;
}): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function testProvider(
  provider: string,
  apiKey: string
): Promise<{ valid: boolean; provider: string; message: string }> {
  const res = await fetch(`${API_BASE}/test-provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, api_key: apiKey }),
  });
  if (!res.ok) throw new Error('Provider test failed');
  return res.json();
}

export async function preprocessSketch(file: File): Promise<PreprocessResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/preprocess-sketch`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to process sketch' }));
    throw new Error(errorData.detail || 'Failed to process sketch');
  }

  return res.json();
}

export async function buildPrompt(params: {
  user_prompt: string;
  style: string;
  building_type: string;
  lighting: string;
  materials: string;
}): Promise<{
  compiled_prompt: string;
  negative_prompt: string;
  style_summary: string;
  building_summary: string;
  lighting_summary: string;
}> {
  const res = await fetch(`${API_BASE}/build-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to compile prompt');
  return res.json();
}

export async function generateRender(params: GenerationParams): Promise<GenerationResult> {
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Generation failed' }));
    throw new Error(err.detail || 'Architectural generation failed');
  }

  return res.json();
}

export async function getExamples(): Promise<ExampleCase[]> {
  const res = await fetch(`${API_BASE}/examples`);
  if (!res.ok) throw new Error('Failed to load example gallery');
  return res.json();
}

export async function getProjects(params?: {
  search?: string;
  building_type?: string;
  style?: string;
  favorites_only?: boolean;
}): Promise<ArchitecturalProject[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.building_type && params.building_type !== 'All') query.append('building_type', params.building_type);
  if (params?.style && params.style !== 'All') query.append('style', params.style);
  if (params?.favorites_only) query.append('favorites_only', 'true');

  const res = await fetch(`${API_BASE}/projects?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function getProject(id: string): Promise<ArchitecturalProject> {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error('Project not found');
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
}

export async function toggleFavorite(id: string): Promise<{ status: string; is_favorite: boolean }> {
  const res = await fetch(`${API_BASE}/projects/${id}/favorite`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

