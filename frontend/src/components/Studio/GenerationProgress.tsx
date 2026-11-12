import React, { useEffect, useState } from 'react';
import { Cpu, Sparkles, CheckCircle2, Layers, Sun } from 'lucide-react';

interface GenerationProgressProps {
  isGenerating: boolean;
  providerLabel?: string;
}

const STAGES = [
  { label: 'Preprocessing Sketch Geometry', desc: 'Bilateral filtering & contrast normalization' },
  { label: 'Extracting OpenCV Canny Edges', desc: 'Isolating structural contours & building silhouette' },
  { label: 'Conditioning ControlNet Latent Space', desc: 'Locking structural bounds and perspective geometry' },
  { label: 'Diffusing Architectural Materials', desc: 'Synthesizing glass reflections, concrete & ambient lighting' },
  { label: 'Final Architectural Composition', desc: 'High-resolution tonal mapping and atmospheric depth' }
];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  isGenerating,
  providerLabel,
}) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [progressPercent, setProgressPercent] = useState(15);

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStage(0);
      setProgressPercent(15);
      return;
    }

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 94) return 94;
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next > 75) setCurrentStage(4);
        else if (next > 55) setCurrentStage(3);
        else if (next > 35) setCurrentStage(2);
        else if (next > 20) setCurrentStage(1);
        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-elevated p-6 space-y-5 animate-fade-in ring-2 ring-blue-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-navy-900 text-cyan-300 flex items-center justify-center shadow-xs animate-spin-slow">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy-900 font-sans">
              Synthesizing Photorealistic Campus Render...
            </h4>
            <p className="text-xs text-slate-500 font-mono">
              {providerLabel || 'Executing image-to-image diffusion pipeline'}
            </p>
          </div>
        </div>

        <span className="font-mono text-base font-bold text-arch-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
        <div
          className="h-full bg-gradient-to-r from-arch-blue via-arch-cyan to-teal-400 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stepper feedback */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
        {STAGES.map((st, idx) => {
          const isDone = currentStage > idx;
          const isCurrent = currentStage === idx;
          return (
            <div
              key={st.label}
              className={`p-2 rounded-lg border transition-all text-left ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                  : isCurrent
                  ? 'border-arch-blue bg-blue-50/70 text-navy-900 shadow-xs'
                  : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className={`w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center shrink-0 ${isCurrent ? 'bg-navy-900 text-white' : 'bg-slate-300 text-slate-700'}`}>
                    {idx + 1}
                  </span>
                )}
                <p className="text-[10px] font-bold line-clamp-1">{st.label}</p>
              </div>
              <p className="text-[9px] text-slate-500 line-clamp-1 hidden sm:block">
                {st.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

