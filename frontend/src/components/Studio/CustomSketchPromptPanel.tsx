import React from 'react';
import { Sparkles } from 'lucide-react';

interface CustomSketchPromptPanelProps {
  positivePrompt: string;
  onPositivePromptChange: (value: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
}

export const CustomSketchPromptPanel: React.FC<CustomSketchPromptPanelProps> = ({
  positivePrompt,
  onPositivePromptChange,
  negativePrompt,
  onNegativePromptChange,
}) => (
  <section className="bg-white rounded-xl border border-canvas-300 shadow-subtle p-5 space-y-4">
    <div>
      <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-arch-cyan" />
        Describe your custom image
      </h2>
      <p className="text-xs text-slate-500 mt-1">
        Write what the sketch should become. These prompts go directly to the image model; no architecture style or building description is added.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-navy-900">Positive prompt <span className="text-rose-600">*</span></span>
        <textarea
          rows={5}
          value={positivePrompt}
          onChange={(event) => onPositivePromptChange(event.target.value)}
          placeholder="A curious orange cat sitting on a windowsill, soft natural light, detailed fur, warm colors"
          className="w-full text-xs p-3 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan leading-relaxed resize-y"
        />
        <span className="block text-[10px] text-slate-500">Describe the subject, appearance, setting, and visual style you want.</span>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-semibold text-navy-900">Negative prompt</span>
        <textarea
          rows={5}
          value={negativePrompt}
          onChange={(event) => onNegativePromptChange(event.target.value)}
          placeholder="blurry, deformed, duplicate subject, text, watermark"
          className="w-full text-xs p-3 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan leading-relaxed resize-y"
        />
        <span className="block text-[10px] text-slate-500">List details the model should avoid. Leave blank if you do not need one.</span>
      </label>
    </div>
  </section>
);
