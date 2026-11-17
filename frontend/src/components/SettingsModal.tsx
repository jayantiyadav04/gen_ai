import React, { useEffect, useState } from 'react';
import { AppConfig } from '../types';
import { updateConfig, testProvider, getConfig } from '../api/client';
import { X, Key, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Sparkles, RefreshCw, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig | null;
  onConfigUpdated: (newConfig: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
}) => {
  const [replicateToken, setReplicateToken] = useState('');
  const [hfKey, setHfKey] = useState('');
  const [falKey, setFalKey] = useState('');
  const [provider, setProvider] = useState(config?.default_provider || 'comfyui');
  const [isSaving, setIsSaving] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; valid: boolean; message: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const localSelected = provider === 'comfyui' || provider === 'local';
  const demoSelected = provider === 'demo';
  const selectedCloudLabel = provider === 'replicate' ? 'Replicate selected'
    : provider === 'huggingface' || provider === 'hf' ? 'Hugging Face selected'
      : provider === 'fal' || provider === 'fal_ai' ? 'Fal.ai selected'
        : provider === 'auto' ? 'Automatic provider selection'
          : 'Generation engine selected';

  // Keep the dropdown in sync with the real saved engine (config loads after first render)
  useEffect(() => {
    if (config?.default_provider) setProvider(config.default_provider);
  }, [config?.default_provider, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async (provName: string, keyVal: string) => {
    if (!keyVal.trim()) {
      setTestResult({
        provider: provName,
        valid: false,
        message: `Please enter a ${provName} token first to test connectivity.`,
      });
      return;
    }

    setTestingProvider(provName);
    setTestResult(null);

    try {
      const res = await testProvider(provName, keyVal.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        provider: provName,
        valid: false,
        message: err.message || 'Connection test failed',
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload: any = { default_provider: provider };
      if (replicateToken.trim()) payload.replicate_api_token = replicateToken.trim();
      if (hfKey.trim()) payload.huggingface_api_key = hfKey.trim();
      if (falKey.trim()) payload.fal_key = falKey.trim();

      await updateConfig(payload);
      const latestConfig = await getConfig();
      onConfigUpdated(latestConfig);
      setFeedback({ type: 'success', message: 'Settings successfully saved.' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-float border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-canvas-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white">
              <Cpu className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 font-sans">
                Generative AI Model Settings
              </h3>
              <p className="text-xs text-slate-500">
                Default engine: local Stable Diffusion 1.5 + ControlNet Canny (ComfyUI)
              </p>
            </div>
          </div>
          <button
            aria-label="Close settings"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          {/* Active Mode Notice */}
          <div
                className={`p-3.5 rounded-lg border text-xs leading-relaxed ${demoSelected
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              }`}
          >
            <div className="flex items-start gap-2">
              {demoSelected ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  Status: {demoSelected ? 'Demo Architectural Engine Selected' : localSelected ? 'Local ComfyUI Engine Selected' : selectedCloudLabel}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {demoSelected
                    ? 'Offline procedural illustrations are used. Select a diffusion engine for model-generated images.'
                    : localSelected
                      ? 'Images are generated on this computer. Keep ComfyUI Desktop open. The first image is slower while the models load.'
                      : provider === 'auto'
                        ? 'Uses Replicate, then Hugging Face, then Fal.ai when configured; otherwise uses local ComfyUI.'
                        : 'The selected provider is used for generation; add its API key below if it is not configured.'}
                </p>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1.5 uppercase tracking-wider font-sans">
              Active Generation Engine
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
            >
              <option value="comfyui">Local ComfyUI (Free: Stable Diffusion 1.5 + ControlNet Canny)</option>
              <option value="auto">Auto (cloud key priority, then local ComfyUI)</option>
              <option value="replicate">Replicate SDXL ControlNet</option>
              <option value="huggingface">Hugging Face Inference API</option>
              <option value="fal">Fal.ai SDXL Image-to-Image</option>
              <option value="demo">Demo Simulation Mode (Explicit offline procedural testing)</option>
            </select>
            {(provider === 'comfyui' || provider === 'local') && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setTestingProvider('comfyui');
                    setTestResult(null);
                    try {
                      setTestResult(await testProvider('comfyui', ''));
                    } catch (err: any) {
                      setTestResult({ provider: 'comfyui', valid: false, message: err.message || 'Connection test failed' });
                    } finally {
                      setTestingProvider(null);
                    }
                  }}
                  disabled={testingProvider === 'comfyui'}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded border border-slate-300 bg-white text-navy-900 hover:bg-canvas-100 disabled:opacity-60"
                >
                  {testingProvider === 'comfyui' ? 'Checking...' : 'Check ComfyUI connection'}
                </button>
                {testResult && testResult.provider.toLowerCase().includes('comfyui') && (
                  <span className={`text-[11px] ${testResult.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {testResult.message}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Replicate Token Input (PRIMARY) */}
          <div className="space-y-1.5 bg-blue-50/50 p-3.5 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-navy-900 text-cyan-300">
                  Primary
                </span>
                <label className="text-xs font-bold text-navy-900 font-sans">
                  Replicate API Token
                </label>
              </div>
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-arch-blue hover:underline flex items-center gap-1 font-semibold"
              >
                Get Free Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={config?.has_replicate_token ? '•••••••••••••••• (Configured)' : 'r8_xxxxxxxxxxxxxxxxxxxxxxxxx'}
                value={replicateToken}
                onChange={(e) => setReplicateToken(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
              />
              <button
                type="button"
                onClick={() => handleTestKey('replicate', replicateToken)}
                disabled={testingProvider === 'replicate'}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1"
              >
                {testingProvider === 'replicate' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-arch-cyan" />
                ) : (
                  <span>Test Token</span>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-600 font-mono">
              Model: <code>lucataco/sdxl-controlnet</code> (Version: <code>06d6fae3b75a...</code>)
            </p>
          </div>

          {/* Secondary Providers Accordion / Hugging Face */}
          <div className="space-y-1.5 bg-canvas-50/60 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider font-sans">
                Hugging Face Token (Secondary)
              </label>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-arch-cyan hover:underline flex items-center gap-1 font-medium"
              >
                Get Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={config?.has_huggingface_key ? '•••••••••••••••• (Configured)' : 'hf_xxxxxxxxxxxxxxxxxxxxxxxxx'}
                value={hfKey}
                onChange={(e) => setHfKey(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
              />
              <button
                type="button"
                onClick={() => handleTestKey('huggingface', hfKey)}
                disabled={testingProvider === 'huggingface'}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1"
              >
                {testingProvider === 'huggingface' ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-arch-cyan" />
                ) : (
                  <span>Test Key</span>
                )}
              </button>
            </div>
          </div>

          {/* Fal.ai credential */}
          <div className="space-y-1.5 bg-canvas-50/60 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider font-sans">
                Fal.ai API Key
              </label>
              <a
                href="https://fal.ai/dashboard/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-arch-cyan hover:underline flex items-center gap-1 font-medium"
              >
                Get Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={config?.has_fal_key ? '•••••••••••••••• (Configured)' : 'Fal key'}
                value={falKey}
                onChange={(e) => setFalKey(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
              />
              <button
                type="button"
                onClick={() => handleTestKey('fal', falKey)}
                disabled={testingProvider === 'fal'}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors shrink-0 flex items-center gap-1"
              >
                {testingProvider === 'fal' ? <RefreshCw className="w-3 h-3 animate-spin text-arch-cyan" /> : <span>Test Key</span>}
              </button>
            </div>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${testResult.valid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.provider} Verification:</p>
                <p className="mt-0.5">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Save Feedback */}
          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-1.5 ${feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
