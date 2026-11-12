import React, { useState } from 'react';
import { AppConfig } from '../types';
import { updateConfig } from '../api/client';
import { X, Key, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Sparkles, Sliders } from 'lucide-react';

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
  const [hfKey, setHfKey] = useState('');
  const [replicateToken, setReplicateToken] = useState('');
  const [provider, setProvider] = useState(config?.default_provider || 'auto');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const payload: any = { default_provider: provider };
      if (hfKey.trim()) payload.huggingface_api_key = hfKey.trim();
      if (replicateToken.trim()) payload.replicate_api_token = replicateToken.trim();

      const res = await updateConfig(payload);
      setFeedback({ type: 'success', message: 'Settings successfully saved.' });
      
      // Update parent config
      if (config) {
        onConfigUpdated({
          ...config,
          default_provider: provider,
          has_huggingface_key: Boolean(hfKey.trim() || config.has_huggingface_key),
          has_replicate_token: Boolean(replicateToken.trim() || config.has_replicate_token),
          is_demo_mode: !Boolean(hfKey.trim() || replicateToken.trim() || config.has_huggingface_key || config.has_replicate_token),
        });
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update configuration.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-float border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-canvas-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white">
              <Key className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 font-sans">
                AI Engine & Provider Settings
              </h3>
              <p className="text-xs text-slate-500">
                Configure live GPU diffusion endpoints or run local simulation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Active Mode Notice */}
          <div
            className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
              config?.is_demo_mode
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {config?.is_demo_mode ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  Current Status: {config?.is_demo_mode ? 'Demo Architectural Engine Active' : 'Live Cloud GPU Connected'}
                </p>
                <p className="mt-0.5 text-slate-600">
                  {config?.is_demo_mode
                    ? 'The application uses the built-in procedural synthesis engine. Add a free Hugging Face API key below to enable live cloud GPU image-to-image diffusion.'
                    : 'System is configured to dispatch image-to-image ControlNet requests to live cloud diffusion models.'}
                </p>
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-navy-900 mb-1.5 uppercase tracking-wider font-sans">
              Generation Engine Priority
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan focus:border-transparent font-medium"
            >
              <option value="auto">Automatic (Cloud GPU if key present, else Demo)</option>
              <option value="huggingface">Hugging Face Inference API (ControlNet SDXL)</option>
              <option value="replicate">Replicate API (SDXL ControlNet Canny)</option>
              <option value="demo">Demo Simulation Mode (Local Procedural Engine)</option>
            </select>
          </div>

          {/* Hugging Face Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider font-sans">
                Hugging Face Token
              </label>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-arch-cyan hover:underline flex items-center gap-1 font-medium"
              >
                Get Free Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder={config?.has_huggingface_key ? '•••••••••••••••• (Configured)' : 'hf_xxxxxxxxxxxxxxxxxxxxxxxxx'}
              value={hfKey}
              onChange={(e) => setHfKey(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-arch-cyan focus:border-transparent"
            />
            <p className="text-[11px] text-slate-500">
              Powers <code>diffusers/controlnet-canny-sdxl-1.0</code> for structural campus generation.
            </p>
          </div>

          {/* Replicate Token Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider font-sans">
                Replicate API Token (Optional)
              </label>
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-arch-cyan hover:underline flex items-center gap-1 font-medium"
              >
                Get Token <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              placeholder={config?.has_replicate_token ? '•••••••••••••••• (Configured)' : 'r8_xxxxxxxxxxxxxxxxxxxxxxxxx'}
              value={replicateToken}
              onChange={(e) => setReplicateToken(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-arch-cyan focus:border-transparent"
            />
          </div>

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-1.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
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

