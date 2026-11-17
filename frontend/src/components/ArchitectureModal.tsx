import React from 'react';
import { X, Layers, Cpu, Eye, ArrowDown, ShieldCheck, CheckCircle2, Sliders, Sparkles } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: '01',
      title: 'User Uploads Architectural Sketch',
      subtitle: 'Input Acquisition & Sanitization',
      desc: 'Architectural elevation, perspective, or masterplan sketch uploaded as PNG/JPG/WebP. Uploads are limited to 20MB and image dimensions are capped; preprocessing previews and engine input resizing can differ.',
      tech: 'FastAPI • Pydantic • PIL',
      color: 'border-slate-300 bg-white text-navy-900'
    },
    {
      step: '02',
      title: 'OpenCV Preprocessing + Edge Detection',
      subtitle: 'Structural Feature Extraction',
      desc: 'Bilateral filtering and Canny edge detection prepare a visual edge preview. Local ComfyUI runs its own Canny step; cloud engines use the conditioning method supported by that provider.',
      tech: 'OpenCV • Canny Alg • Bilateral Filter',
      color: 'border-blue-300 bg-blue-50/60 text-navy-900'
    },
    {
      step: '03',
      title: 'ControlNet + Image-to-Image Diffusion',
      subtitle: 'Structural Guidance + Generative AI',
      desc: 'When supported, ControlNet uses sketch edges to guide building massing and contours. The prompt compiler adds style, materials, lighting, and landscape details; generated geometry can still differ from the sketch.',
      tech: 'ControlNet Canny • Stable Diffusion 1.5 • Prompt Builder',
      color: 'border-cyan-300 bg-cyan-50/60 text-navy-900'
    },
    {
      step: '04',
      title: 'Campus Concept Image',
      subtitle: 'Materials & Lighting',
      desc: 'The selected engine generates a concept image from the sketch and prompt. Materials, lighting, and other details vary by engine and may differ from the request.',
      tech: 'Local ComfyUI • 768 px output • Concept quality',
      color: 'border-indigo-300 bg-indigo-50/60 text-navy-900'
    },
    {
      step: '05',
      title: 'Compare • Save • Download',
      subtitle: 'Interactive Evaluation Suite',
      desc: 'Interactive split-slider comparison, side-by-side mode, an OpenCV edge preview, image download, and a persistent project gallery.',
      tech: 'SQLite • Canvas Confetti • File Export',
      color: 'border-emerald-300 bg-emerald-50/60 text-navy-900'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-float border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-canvas-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white">
              <Layers className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 font-sans">
                CampusVision AI Pipeline Architecture
              </h3>
              <p className="text-xs text-slate-500">
              Sketch-guided image generation workflow
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

        {/* Workflow Diagram & Details */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-canvas-100/70 p-3.5 rounded-lg border border-canvas-300 text-xs text-slate-700 leading-relaxed">
            <p className="font-semibold text-navy-900 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-arch-cyan" />
              Sketch Guidance for Educational Architecture
            </p>
            CampusVision AI prepares an <strong>OpenCV edge preview</strong> and uses the selected engine's supported sketch conditioning method.
            This can guide generated images toward a concept drawing, but does not guarantee faithful geometry or replace architectural review.
          </div>

          {/* Stepper Flow */}
          <div className="space-y-3 relative">
            {steps.map((st, idx) => (
              <div key={st.step} className="relative">
                <div className={`p-4 rounded-xl border ${st.color} shadow-xs transition-all hover:shadow-subtle`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs font-bold text-arch-cyan bg-navy-900 text-white px-2 py-0.5 rounded">
                        {st.step}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-navy-900">{st.title}</h4>
                        <p className="text-[11px] text-arch-cyan font-semibold uppercase tracking-wider mt-0.5">
                          {st.subtitle}
                        </p>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {st.desc}
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-block text-[10px] font-mono text-slate-500 bg-white/80 border border-slate-200 px-2 py-1 rounded shrink-0">
                      {st.tech}
                    </span>
                  </div>
                </div>

                {/* Arrow connector */}
                {idx < steps.length - 1 && (
                  <div className="flex justify-center -my-1.5 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-canvas-200 border border-canvas-300 flex items-center justify-center text-slate-500 shadow-xs">
                      <ArrowDown className="w-3 h-3 text-slate-600" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-canvas-50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">Domain: Educational Facility Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg transition-colors"
          >
            Close Diagram
          </button>
        </div>
      </div>
    </div>
  );
};

