import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, Clock, Cpu, Download, Eye, Layers } from 'lucide-react';

interface GenerationProgressProps {
  isGenerating: boolean;
  providerLabel?: string;
  isLocal?: boolean;
  isDemo?: boolean;
}

const REAL_PIPELINE_PHASES = [
  {
    phase: 'Preprocessing',
    title: 'OpenCV Canny Edge Extraction',
    detail: 'Isolating structural contours, bilateral filtering, and aspect ratio normalization',
    icon: Layers,
    minTime: 0,
  },
  {
    phase: 'Submission',
    title: 'Submitting Sketch and Prompt',
    detail: 'Sending the sketch and prompt to the selected image generation engine.',
    icon: Cpu,
    minTime: 2,
  },
  {
    phase: 'Inference',
    title: 'Model Image Generation',
    detail: 'The selected provider is generating an image using its configured sketch-conditioning method.',
    icon: Sparkles,
    minTime: 6,
  },
  {
    phase: 'Downloading',
    title: 'Retrieving the Render',
    detail: 'Downloading the finished image and checking that it is valid',
    icon: Download,
    minTime: 18,
  },
  {
    phase: 'Finalizing',
    title: 'Saving the Result',
    detail: 'Saving the generated image and adding its record to project history.',
    icon: Eye,
    minTime: 24,
  },
];

// Local generation on a laptop takes minutes, so the later phases must not be shown after a few seconds.
const LOCAL_PHASE_START = [0, 2, 5, 100000, 100000];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  isGenerating,
  providerLabel,
  isLocal,
  isDemo = false,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isGenerating]);

  if (!isGenerating) return null;

  const demoPhases = [
    { phase: 'Sketch', title: 'Reading the Uploaded Sketch', detail: 'Preparing the sketch edges for a procedural illustration.', icon: Layers, minTime: 0 },
    { phase: 'Drawing', title: 'Building a Demo Illustration', detail: 'The Demo engine draws a simplified architectural illustration; it does not run diffusion or use prompts.', icon: Cpu, minTime: 2 },
    { phase: 'Finishing', title: 'Finishing the Illustration', detail: 'Applying procedural colors and saving the offline demonstration image.', icon: Sparkles, minTime: 5 },
    { phase: 'Saving', title: 'Saving the Result', detail: 'Adding the demo image to project history.', icon: Download, minTime: 8 },
    { phase: 'Ready', title: 'Preparing the Comparison', detail: 'Preparing the sketch and demo illustration for comparison.', icon: Eye, minTime: 12 },
  ];
  const phases = isDemo ? demoPhases : REAL_PIPELINE_PHASES;

  // Determine active phase based on elapsed real-world time
  const currentPhaseIndex = phases.reduce((acc, stage, idx) => {
    const start = isLocal ? LOCAL_PHASE_START[idx] : stage.minTime;
    if (elapsedSeconds >= start) return idx;
    return acc;
  }, 0);

  const activePhase = phases[currentPhaseIndex];
  const ActiveIcon = activePhase.icon;
  const activeDetail = isLocal
    ? currentPhaseIndex === 0
      ? 'Checking the prepared sketch; ComfyUI will resize it and run its own Canny step.'
      : currentPhaseIndex === 1
        ? 'Sending the original sketch and prompts to ComfyUI; the site edge map is only an inspection preview.'
        : activePhase.detail
    : activePhase.detail;

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-elevated p-6 space-y-5 animate-fade-in ring-2 ring-blue-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-900 text-cyan-300 flex items-center justify-center shadow-xs">
            <ActiveIcon className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h4 className="text-sm font-bold text-navy-900 font-sans">
                {activePhase.title}
              </h4>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {providerLabel || 'Active AI Pipeline'} &bull; Phase {currentPhaseIndex + 1} of {phases.length}
            </p>
          </div>
        </div>

        {/* Real elapsed clock instead of fabricated percentage */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-900 text-cyan-300 font-mono text-xs font-semibold shadow-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimer(elapsedSeconds)}</span>
        </div>
      </div>

      {/* Dynamic Animated Status Description */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
        <span className="font-semibold text-navy-900">Current Action:</span>
        <span className="text-slate-700">
          {activeDetail}
          {isLocal && currentPhaseIndex === 2 ? ' (running on this computer; it can take a few minutes, especially on the first run)' : ''}
        </span>
      </div>

      {/* Stepper feedback across all 5 genuine pipeline stages */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
        {phases.map((st, idx) => {
          const isDone = currentPhaseIndex > idx;
          const isCurrent = currentPhaseIndex === idx;
          return (
            <div
              key={st.phase}
              className={`p-2.5 rounded-lg border transition-all text-left ${
                isDone
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : isCurrent
                  ? 'border-arch-blue bg-blue-50/90 text-navy-900 shadow-xs ring-1 ring-blue-300'
                  : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span
                    className={`w-3.5 h-3.5 rounded-full text-[9px] font-mono font-bold flex items-center justify-center shrink-0 ${
                      isCurrent ? 'bg-navy-900 text-white' : 'bg-slate-300 text-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
                <p className="text-[11px] font-bold line-clamp-1">{st.phase}</p>
              </div>
              <p className="text-[9px] text-slate-500 line-clamp-1 hidden sm:block">
                {st.title}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
