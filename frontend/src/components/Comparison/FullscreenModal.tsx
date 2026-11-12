import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ComparisonViewer } from './ComparisonViewer';

interface FullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalUrl: string;
  renderUrl: string;
  edgeUrl?: string;
  title?: string;
}

export const FullscreenModal: React.FC<FullscreenModalProps> = ({
  isOpen,
  onClose,
  originalUrl,
  renderUrl,
  edgeUrl,
  title,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy-900/95 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 text-white">
        <div>
          <h3 className="text-base font-bold font-sans tracking-wide">
            {title || 'Architectural Visualization Inspector'}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            High-Resolution Structural Comparison & Verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-navy-800 border border-slate-700 rounded-lg p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 ml-1"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-navy-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main View Container */}
      <div className="flex-1 w-full overflow-auto flex items-center justify-center py-2">
        <div
          className="transition-transform duration-150 origin-center max-w-6xl w-full"
          style={{ transform: `scale(${zoom})` }}
        >
          <ComparisonViewer
            originalUrl={originalUrl}
            renderUrl={renderUrl}
            edgeUrl={edgeUrl}
            title={title}
            aspectRatio="aspect-[16/10]"
          />
        </div>
      </div>
    </div>
  );
};

