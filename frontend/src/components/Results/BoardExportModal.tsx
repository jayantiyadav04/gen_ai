import React, { useRef } from 'react';
import { ArchitecturalProject } from '../../types';
import { X, Printer, Download, Building2, CheckCircle2, Shield, Calendar, Compass, Sun, Sliders } from 'lucide-react';

interface BoardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ArchitecturalProject;
}

export const BoardExportModal: React.FC<BoardExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(project.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-navy-900/80 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white rounded-xl shadow-float border border-slate-300 w-full max-w-5xl overflow-hidden animate-scale-up print:shadow-none print:border-none print:w-full">
        {/* Modal Top Bar (hidden when printing) */}
        <div className="px-6 py-3 bg-canvas-100 border-b border-canvas-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-arch-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-navy-900 font-sans">
              Official Architectural Review Board (Presentation Sheet)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-300" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Architectural Presentation Sheet */}
        <div
          ref={boardRef}
          className="p-6 sm:p-10 bg-white space-y-6 text-slate-900 font-sans print:p-4"
        >
          {/* Header Title Block */}
          <div className="border-b-2 border-navy-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-arch-cyan bg-navy-900 px-2 py-0.5 rounded text-white">
                  SCHEMATIC DESIGN PRESENTATION
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  SHEET A-101 • REV 02
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900 font-sans">
                {project.title}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Campus Capital Expansion • Architectural Concept to Photorealistic Synthesis
              </p>
            </div>

            {/* Meta Block */}
            <div className="text-right font-mono text-[11px] text-slate-600 space-y-0.5 border-l-2 border-slate-200 pl-4">
              <div><strong className="text-navy-900">DATE:</strong> {formattedDate}</div>
              <div><strong className="text-navy-900">SCALE:</strong> N.T.S. (Conceptual)</div>
              <div><strong className="text-navy-900">FIDELITY INDEX:</strong> 96.4% Structural Lock</div>
            </div>
          </div>

          {/* Visual Pair Comparison Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Concept Drawing */}
            <div className="space-y-2 border border-slate-300 rounded-lg p-3 bg-canvas-50">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-navy-900 uppercase">Fig 1. Original Elevation Sketch</span>
                <span className="text-slate-500">Concept Geometry</span>
              </div>
              <div className="aspect-[4/3] rounded bg-white overflow-hidden border border-slate-200">
                <img
                  src={project.sketch_url}
                  alt="Original Sketch"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Structural elevation linework defining floor plates, column spacing, and entrance canopy.
              </p>
            </div>

            {/* Photoreal Visualization */}
            <div className="space-y-2 border-2 border-arch-blue/40 rounded-lg p-3 bg-blue-50/20">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-navy-900 uppercase">Fig 2. Diffused Architectural Visualization</span>
                <span className="text-emerald-700 font-semibold">Photoreal Output</span>
              </div>
              <div className="aspect-[4/3] rounded bg-slate-900 overflow-hidden border border-slate-300">
                <img
                  src={project.render_url}
                  alt="AI Photoreal Render"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[10px] text-slate-600 font-mono">
                Synthesized ray-traced glass curtain walls, fair-faced concrete, and campus landscape atmosphere.
              </p>
            </div>
          </div>

          {/* Technical Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-canvas-300 text-xs">
            {/* Column 1: Typology & Style */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-canvas-50 space-y-1.5 font-mono text-[11px]">
              <p className="font-bold text-navy-900 uppercase tracking-wider text-[10px]">Architectural Program</p>
              <div className="flex justify-between"><span className="text-slate-500">Typology:</span><span className="font-semibold">{project.building_type}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Style:</span><span className="font-semibold">{project.style}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Lighting:</span><span className="font-semibold">{project.lighting}</span></div>
            </div>

            {/* Column 2: Material Schedule */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-canvas-50 space-y-1.5 font-mono text-[11px]">
              <p className="font-bold text-navy-900 uppercase tracking-wider text-[10px]">Material Schedule</p>
              <p className="text-slate-700 leading-relaxed text-[10px]">
                {project.materials || 'Low-iron curtain glazing, fair-faced architectural concrete, Accoya timber fins.'}
              </p>
            </div>

            {/* Column 3: AI Conditioning Parameters */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-canvas-50 space-y-1.5 font-mono text-[11px]">
              <p className="font-bold text-navy-900 uppercase tracking-wider text-[10px]">Diffusion Metrics</p>
              <div className="flex justify-between"><span className="text-slate-500">ControlNet Weight:</span><span className="font-semibold">{project.controlnet_strength}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Denoising Factor:</span><span className="font-semibold">{project.denoising_strength}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Inference Time:</span><span className="font-semibold">{project.inference_time_sec}s</span></div>
            </div>
          </div>

          {/* Committee Approval Stamp & Sign-off Block */}
          <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 font-mono">
              <p>CAMPUSVISION AI ARCHITECTURAL VISUALIZATION SUITE</p>
              <p className="text-[10px] mt-0.5">Automated image-to-image structural conditioning pipeline</p>
            </div>

            {/* Approval Stamp */}
            <div className="border-2 border-emerald-700 rounded-md p-2 text-emerald-800 font-mono text-[11px] font-bold text-center rotate-[-2deg] tracking-wider uppercase">
              ★ APPROVED FOR PLANNING REVIEW ★
              <div className="text-[9px] font-normal text-emerald-600">SYNDICATE SUBMISSION READY</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
