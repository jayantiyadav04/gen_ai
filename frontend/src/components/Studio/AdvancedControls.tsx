import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp, HelpCircle, RefreshCw } from 'lucide-react';

interface AdvancedControlsProps {
  controlnetStrength: number;
  onControlnetStrengthChange: (v: number) => void;
  denoisingStrength: number;
  onDenoisingStrengthChange: (v: number) => void;
  guidanceScale: number;
  onGuidanceScaleChange: (v: number) => void;
  seed: number;
  provider?: string;
  onSeedChange: (v: number) => void;
  resolution: string;
  onResolutionChange: (v: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (v: string) => void;
  promptMode?: 'architecture' | 'custom';
}

export const AdvancedControls: React.FC<AdvancedControlsProps> = ({
  controlnetStrength,
  onControlnetStrengthChange,
  denoisingStrength,
  onDenoisingStrengthChange,
  guidanceScale,
  onGuidanceScaleChange,
  seed,
  provider = 'comfyui',
  onSeedChange,
  resolution,
  onResolutionChange,
  negativePrompt,
  onNegativePromptChange,
  promptMode = 'architecture',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLocal = provider === 'comfyui' || provider === 'local';
  const isDemo = provider === 'demo';
  const supportsControlnet = !isDemo && provider !== 'fal' && provider !== 'fal_ai';
  const supportsDenoising = provider === 'fal' || provider === 'fal_ai';
  const supportsSeed = isLocal || provider === 'replicate';
  const supportsPromptGuidance = !isDemo;

  return (
    <div className="bg-white rounded-xl border border-canvas-300 shadow-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-canvas-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-arch-cyan" />
          <span className="text-xs font-bold text-navy-900 uppercase tracking-wider font-sans">
            3. Advanced Diffusion & Guidance Controls
          </span>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            ControlNet • CFG • Resolution
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-5 border-t border-canvas-200 bg-canvas-50/50 space-y-5 text-xs animate-fade-in">
          {/* Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ControlNet Strength */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-navy-900 font-sans">
                  Structural Guidance (ControlNet)
                </label>
                <span className="font-mono font-bold text-arch-blue bg-blue-50 px-1.5 py-0.5 rounded">
                  {controlnetStrength.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={controlnetStrength}
                disabled={!supportsControlnet}
                onChange={(e) => onControlnetStrengthChange(parseFloat(e.target.value))}
                className={`w-full accent-arch-cyan ${supportsControlnet ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              />
              <p className="text-[10px] text-slate-500">
                {supportsControlnet
                  ? 'Higher = stricter adherence to sketch lines; lower = more creative freedom.'
                  : provider === 'fal' || provider === 'fal_ai'
                    ? 'Fal uses image-to-image strength instead of ControlNet.'
                    : 'The procedural Demo engine does not use ControlNet strength.'}
              </p>
            </div>

            {/* Denoising Strength */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-navy-900 font-sans">
                  Denoising Strength
                </label>
                <span className="font-mono font-bold text-arch-blue bg-blue-50 px-1.5 py-0.5 rounded">
                  {denoisingStrength.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={denoisingStrength}
                disabled={!supportsDenoising}
                onChange={(e) => onDenoisingStrengthChange(parseFloat(e.target.value))}
                className={`w-full accent-arch-cyan ${supportsDenoising ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              />
              <p className="text-[10px] text-slate-500">
                {supportsDenoising
                  ? promptMode === 'custom'
                    ? 'Amount of image transformation and new detail.'
                    : 'Amount of image transformation and material synthesis.'
                  : isLocal
                    ? 'Not used in local mode; the ComfyUI workflow uses denoise 1.0.'
                    : 'This provider does not accept a denoising strength.'}
              </p>
            </div>

            {/* Prompt Guidance Scale (CFG) */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-navy-900 font-sans">
                  Prompt Guidance Scale (CFG)
                </label>
                <span className="font-mono font-bold text-arch-blue bg-blue-50 px-1.5 py-0.5 rounded">
                  {guidanceScale.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={guidanceScale}
                disabled={!supportsPromptGuidance}
                onChange={(e) => onGuidanceScaleChange(parseFloat(e.target.value))}
                className={`w-full accent-arch-cyan ${supportsPromptGuidance ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
              />
              <p className="text-[10px] text-slate-500">
                {supportsPromptGuidance
                  ? 'Around 7 works well for Stable Diffusion 1.5. Much higher values look harsh.'
                  : 'The procedural Demo engine does not use prompt guidance.'}
              </p>
            </div>
          </div>

          {/* Resolution & Seed row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Resolution */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
              <label className="font-semibold text-navy-900 font-sans block">
                Target Render Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Landscape (4:3)', val: '1024x768' },
                  { label: 'Square (1:1)', val: '1024x1024' },
                  { label: 'Portrait (3:4)', val: '768x1024' },
                ].map((res) => (
                  <button
                    key={res.val}
                    type="button"
                    disabled
                    onClick={() => onResolutionChange(res.val)}
                    className={`py-1.5 px-2 rounded text-[11px] font-mono border transition-all ${isLocal ? 'opacity-50 cursor-not-allowed ' : ''}${
                      resolution === res.val
                        ? 'bg-navy-900 text-white border-navy-900 font-semibold shadow-xs'
                        : 'bg-canvas-50 text-slate-700 border-slate-200 hover:bg-canvas-100'
                    }`}
                  >
                    {res.val}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500">
                {isLocal
                  ? 'Local mode matches Desktop: fixed 768×512 output, Canny 0.4/0.8, and 25 Euler steps.'
                  : 'The selected engine chooses output dimensions. The actual size is shown with the result.'}
              </p>
            </div>

            {/* Seed */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-navy-900 font-sans">
                  Seed (Reproducibility)
                </label>
                <button
                  type="button"
                  onClick={() => onSeedChange(-1)}
                  disabled={!supportsSeed}
                  className="text-[10px] text-arch-cyan hover:underline flex items-center gap-1 font-mono"
                >
                  <RefreshCw className="w-3 h-3" /> Randomize (-1)
                </button>
              </div>
              <input
                type="number"
                value={seed}
                disabled={!supportsSeed}
                onChange={(e) => onSeedChange(parseInt(e.target.value) || -1)}
                placeholder="-1 for random generation"
                className={`w-full text-xs font-mono px-3 py-1.5 bg-canvas-50 border border-slate-200 rounded text-slate-800 ${supportsSeed ? '' : 'opacity-50 cursor-not-allowed'}`}
              />
              <p className="text-[10px] text-slate-500">
                {supportsSeed
                  ? isLocal ? 'Use -1 to randomize; ComfyUI reports the random seed it actually used.' : 'Replicate receives a fixed seed; use -1 to let it choose randomly.'
                  : 'This provider does not accept a reproducible seed.'}
              </p>
            </div>
          </div>

          {promptMode === 'architecture' && (
            <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
              <label className="font-semibold text-navy-900 font-sans block">Architectural Negative Prompt</label>
              <textarea
                rows={2}
                value={negativePrompt}
                onChange={(e) => onNegativePromptChange(e.target.value)}
                className="w-full text-[11px] font-mono p-2 bg-canvas-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-arch-cyan leading-relaxed resize-none"
              />
              <p className="text-[10px] text-slate-500 font-mono">
                Suppresses warped columns, floating roofs, sketches in output, cartoon artifacts, and blurry geometry.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

