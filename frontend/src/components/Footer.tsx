import React from 'react';
import { Building2, Github, Shield, Cpu, ExternalLink } from 'lucide-react';

interface FooterProps {
  onOpenArchitecture: () => void;
  onOpenSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenArchitecture, onOpenSettings }) => {
  return (
    <footer className="bg-canvas-100 border-t border-canvas-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white">
                <Building2 className="w-4 h-4 text-cyan-300" />
              </div>
              <span className="font-bold text-base tracking-tight text-navy-900 font-sans">
                CampusVision<span className="text-arch-cyan">.ai</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-md leading-relaxed">
              University Generative AI Research & Architectural Visualization Engine.
              Empowering campus planning committees, educational architects, and board presentations
              with structural sketch-to-photoreal image-to-image diffusion.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span className="inline-flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-arch-cyan" /> ControlNet Canny
              </span>
              <span>•</span>
              <span>OpenCV Preprocessing</span>
              <span>•</span>
              <span>FastAPI & PyTorch</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900 mb-3 font-sans">
              System Architecture
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>
                <button
                  onClick={onOpenArchitecture}
                  className="hover:text-arch-blue transition-colors flex items-center gap-1"
                >
                  Image-to-Image Pipeline <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              </li>
              <li>
                <span className="text-slate-500">Structural Guidance Scale</span>
              </li>
              <li>
                <span className="text-slate-500">Architectural Prompt Compiler</span>
              </li>
              <li>
                <button
                  onClick={onOpenSettings}
                  className="hover:text-arch-blue transition-colors"
                >
                  Cloud Model Providers (HF / Replicate)
                </button>
              </li>
            </ul>
          </div>

          {/* Project Details */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-900 mb-3 font-sans">
              University Project Context
            </h4>
            <div className="bg-white/80 p-3 rounded-lg border border-canvas-300 text-xs text-slate-600 space-y-1.5 shadow-subtle">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-navy-900">Image-to-Image</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-500">Domain:</span>
                <span className="font-semibold text-navy-900">Campus Facilities</span>
              </div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-slate-500">Output:</span>
                <span className="font-semibold text-emerald-700">4K Photoreal Renders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-canvas-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <p>© 2026 CampusVision AI • University Generative AI Project</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" /> Sandboxed Local & Cloud Inference
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

