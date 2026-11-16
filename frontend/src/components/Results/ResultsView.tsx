import React, { useState, useEffect } from 'react';
import { ArchitecturalProject } from '../../types';
import { ComparisonViewer } from '../Comparison/ComparisonViewer';
import { FullscreenModal } from '../Comparison/FullscreenModal';
import { BoardExportModal } from './BoardExportModal';
import { toggleFavorite } from '../../api/client';
import { Download, Sparkles, Heart, Share2, ArrowLeft, CheckCircle2, Clock, Cpu, Sliders, ExternalLink, RefreshCw, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResultsViewProps {
  project: ArchitecturalProject;
  onBackToStudio: () => void;
  onRegenerate: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  project,
  onBackToStudio,
  onRegenerate,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isFav, setIsFav] = useState(project.is_favorite);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0284C7', '#1E40AF', '#38BDF8', '#10B981']
      });
    } catch (e) {
      // Ignore if confetti fails
    }
  }, [project.id]);

  const handleToggleFav = async () => {
    try {
      const res = await toggleFavorite(project.id);
      setIsFav(res.is_favorite);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(project.compiled_prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-canvas-300 shadow-subtle">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-canvas-100 hover:bg-canvas-200 rounded-lg transition-colors border border-canvas-300"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Studio
          </button>
          <div>
            <h2 className="text-base font-bold text-navy-900 font-sans">
              {project.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
              <span>{project.building_type}</span>
              <span>•</span>
              <span className="text-arch-cyan font-semibold">{project.style}</span>
              <span>•</span>
              <span>{project.lighting}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleToggleFav}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isFav
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Favorite Design"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          <button
            onClick={() => setIsBoardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-900 bg-canvas-100 hover:bg-canvas-200 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            title="Export official architectural presentation board"
          >
            <FileText className="w-3.5 h-3.5 text-arch-cyan" />
            <span>Review Board Sheet</span>
          </button>

          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-arch-cyan" />
            Regenerate Variation
          </button>

          <button
            onClick={() => handleDownload(project.render_url, `${project.title.replace(/\s+/g, '_')}_render.png`)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            Download Render (PNG)
          </button>
        </div>
      </div>

      {/* Main Interactive Comparison Suite */}
      <ComparisonViewer
        originalUrl={project.sketch_url}
        renderUrl={project.render_url}
        edgeUrl={project.edge_url}
        title={project.title}
        onOpenFullscreen={() => setIsFullscreen(true)}
        aspectRatio="aspect-[16/10]"
      />

      {/* Generation Metadata & Technical Architecture Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Metadata Metrics */}
        <div className="bg-white p-5 rounded-xl border border-canvas-300 shadow-subtle space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-sans flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-arch-cyan" />
            Conditioning Parameters
          </h4>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-canvas-200">
              <span className="text-slate-500">ControlNet Guidance:</span>
              <span className="font-bold text-navy-900">{project.controlnet_strength.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-canvas-200">
              <span className="text-slate-500">Denoising Strength:</span>
              <span className="font-bold text-navy-900">{project.denoising_strength.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-canvas-200">
              <span className="text-slate-500">Guidance Scale (CFG):</span>
              <span className="font-bold text-navy-900">{project.guidance_scale.toFixed(1)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-canvas-200">
              <span className="text-slate-500">Seed:</span>
              <span className="font-bold text-navy-900">{project.seed}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-canvas-200">
              <span className="text-slate-500">Resolution & Ratio:</span>
              <span className="font-bold text-navy-900">{project.resolution} ({project.aspect_ratio || '4:3'})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-canvas-200">
              <span className="text-slate-500">Inference Time:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {project.inference_time_sec}s
                {project.cache_hit && (
                  <span className="ml-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    ⚡ Cached
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Provider & Model Badge */}
          <div className="pt-2 space-y-2">
            <div className="p-2.5 rounded-lg bg-canvas-100 border border-canvas-200 text-xs text-slate-700 flex items-start gap-2">
              <Cpu className="w-4 h-4 text-arch-cyan shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy-900 font-sans">Active Engine & Model</p>
                <p className="text-[11px] font-mono text-slate-700 font-bold mt-0.5">
                  {project.model_name || project.provider}
                </p>
                {project.model_version && (
                  <p className="text-[9px] font-mono text-slate-500 truncate max-w-[200px]">
                    v: {project.model_version.slice(0, 16)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Compiled Prompt & Negative Prompt */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-canvas-300 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy-900 font-sans flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-arch-cyan" />
              Synthesized Architectural Prompt
            </h4>
            <button
              onClick={handleCopyPrompt}
              className="text-[11px] text-arch-cyan hover:underline flex items-center gap-1 font-mono font-medium"
            >
              {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              {isCopied ? 'Copied to Clipboard' : 'Copy Prompt'}
            </button>
          </div>

          <div className="bg-canvas-50 p-3.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed max-h-36 overflow-y-auto">
            {project.compiled_prompt}
          </div>

          {project.negative_prompt && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                Negative Suppression Prompt
              </p>
              <div className="bg-canvas-50 p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 line-clamp-2">
                {project.negative_prompt}
              </div>
            </div>
          )}

          {/* Download options */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => handleDownload(project.sketch_url, `${project.title.replace(/\s+/g, '_')}_sketch.png`)}
              className="text-xs font-semibold text-slate-600 hover:text-navy-900 hover:underline flex items-center gap-1 font-mono"
            >
              <Download className="w-3.5 h-3.5" /> Download Concept Sketch
            </button>
            {project.edge_url && (
              <button
                onClick={() => handleDownload(project.edge_url!, `${project.title.replace(/\s+/g, '_')}_edges.png`)}
                className="text-xs font-semibold text-slate-600 hover:text-navy-900 hover:underline flex items-center gap-1 font-mono"
              >
                <Download className="w-3.5 h-3.5" /> Download OpenCV Edge Map
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Inspector Modal */}
      <FullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        originalUrl={project.sketch_url}
        renderUrl={project.render_url}
        edgeUrl={project.edge_url}
        title={project.title}
      />

      {/* Official Review Board Sheet Modal */}
      <BoardExportModal
        isOpen={isBoardOpen}
        onClose={() => setIsBoardOpen(false)}
        project={project}
      />
    </div>
  );
};
