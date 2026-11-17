import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ComparisonMode } from '../../types';
import { SlidersHorizontal, Columns, Layers, Maximize2 } from 'lucide-react';

interface ComparisonViewerProps {
  originalUrl: string;
  renderUrl: string;
  edgeUrl?: string;
  title?: string;
  onOpenFullscreen?: () => void;
  aspectRatio?: string;
  isDemo?: boolean;
  localConditioning?: boolean;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  originalUrl,
  renderUrl,
  edgeUrl,
  title,
  onOpenFullscreen,
  aspectRatio = 'aspect-[4/3]',
  isDemo = false,
  localConditioning = false,
}) => {
  const [mode, setMode] = useState<ComparisonMode>('slider');
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== 'slider' || !containerRef.current) return;
    const element = containerRef.current;
    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [mode]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const width = rect.width;
      const pos = Math.max(0, Math.min(100, (x / width) * 100));
      setSliderPos(pos);
    },
    []
  );

  const handleMouseDown = () => setIsDragging(true);
  const handleTouchStart = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMove]);

  return (
    <div className="bg-white rounded-xl border border-canvas-300 shadow-subtle overflow-hidden flex flex-col">
      {/* Control Header */}
      <div className="px-4 py-2.5 bg-canvas-100/70 border-b border-canvas-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-navy-900 font-sans tracking-wide uppercase">
            Comparison Suite
          </span>
          {title && (
            <span className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
              • {title}
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            type="button"
            aria-label="Show split comparison slider"
            onClick={() => setMode('slider')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
              mode === 'slider'
                ? 'bg-navy-900 text-white font-semibold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
            title="Interactive Split Slider"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split Slider</span>
          </button>
          <button
            type="button"
            aria-label="Show images side by side"
            onClick={() => setMode('side-by-side')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
              mode === 'side-by-side'
                ? 'bg-navy-900 text-white font-semibold'
                : 'text-slate-600 hover:text-navy-900'
            }`}
            title="Side-by-Side View"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Side-by-Side</span>
          </button>
          {edgeUrl && (
            <button
              type="button"
              aria-label="Show edge overlay"
              onClick={() => setMode('edge-overlay')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-colors ${
                mode === 'edge-overlay'
                  ? 'bg-navy-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
              title="Structural Edge Alignment Overlay"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Edge Overlay</span>
            </button>
          )}

          {onOpenFullscreen && (
            <button
              type="button"
              aria-label="Open fullscreen comparison"
              onClick={onOpenFullscreen}
              className="p-1 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded ml-1"
              title="Fullscreen Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative w-full bg-slate-900 select-none">
        {mode === 'slider' && (
          <div
            ref={containerRef}
            className={`relative w-full ${aspectRatio} overflow-hidden cursor-ew-resize`}
            onMouseDown={(e) => {
              handleMove(e.clientX);
              handleMouseDown();
            }}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX);
                handleTouchStart();
              }
            }}
            role="slider"
            tabIndex={0}
            aria-orientation="horizontal"
            aria-label="Sketch and render comparison"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(sliderPos)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                setSliderPos((pos) => Math.max(0, pos - 5));
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                setSliderPos((pos) => Math.min(100, pos + 5));
              } else if (e.key === 'Home') {
                setSliderPos(0);
              } else if (e.key === 'End') {
                setSliderPos(100);
              }
            }}
          >
            {/* Rendered Photoreal Image (Full base) */}
            <img
              src={renderUrl}
              alt={isDemo ? 'Procedural demo illustration' : 'AI-generated concept render'}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Original Sketch Image (Clipped by slider position) */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white shadow-xl"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={originalUrl}
                alt="Original Concept Sketch"
                className="absolute inset-0 w-full h-full object-cover max-w-none"
                style={{
                  width: `${containerWidth || containerRef.current?.clientWidth || 0}px`,
                }}
              />
              {/* Badge: Original Sketch */}
              <div className="absolute top-3 left-3 bg-navy-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded text-[11px] font-mono font-medium shadow-md">
                Original Concept Sketch
              </div>
            </div>

            {/* Badge: Photoreal Render */}
              <div className="absolute top-3 right-3 bg-emerald-950/80 backdrop-blur-sm text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-[11px] font-mono font-medium shadow-md">
              {isDemo ? 'Demo Illustration' : 'AI Render'}
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-8 h-8 -ml-4 rounded-full bg-white text-navy-900 shadow-float border-2 border-navy-900 flex items-center justify-center font-mono text-[10px] font-bold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-navy-900" />
              </div>
            </div>

            {/* Bottom percentage indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono pointer-events-none">
              {Math.round(sliderPos)}% Sketch | {100 - Math.round(sliderPos)}% Render
            </div>
          </div>
        )}

        {mode === 'side-by-side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Original Sketch */}
            <div className="relative aspect-[4/3] bg-slate-950 flex flex-col items-center justify-center">
              <img
                src={originalUrl}
                alt="Original Sketch"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-navy-900/85 backdrop-blur-sm text-white px-2.5 py-1 rounded text-[11px] font-mono font-semibold">
                Original Concept Sketch
              </div>
            </div>

            {/* Photoreal Render */}
            <div className="relative aspect-[4/3] bg-slate-950 flex flex-col items-center justify-center">
              <img
                src={renderUrl}
                alt={isDemo ? 'Procedural demo illustration' : 'AI-generated concept render'}
                className="w-full h-full object-cover"
              />
                <div className="absolute top-3 right-3 bg-emerald-950/85 backdrop-blur-sm text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded text-[11px] font-mono font-semibold">
                {isDemo ? 'Demo Illustration' : 'AI Render'}
              </div>
            </div>
          </div>
        )}

        {mode === 'edge-overlay' && edgeUrl && (
          <div className={`relative w-full ${aspectRatio} overflow-hidden`}>
            {/* Base Photoreal Render */}
            <img
              src={renderUrl}
              alt={isDemo ? 'Procedural demo illustration' : 'AI-generated concept render'}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Superimposed OpenCV Canny Edges in Blueprint Cyan */}
            <img
              src={edgeUrl}
              alt="OpenCV edge preview from the uploaded sketch"
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-85 filter hue-rotate-180 brightness-150 contrast-200"
            />
              <div className="absolute top-3 left-3 bg-navy-900/90 border border-cyan-400/50 backdrop-blur-sm text-cyan-300 px-3 py-1 rounded text-[11px] font-mono font-bold shadow-lg">
              {localConditioning ? 'OpenCV Preview (ComfyUI recomputes Canny)' : 'Structural Edge Preview (OpenCV Canny)'}
            </div>
            <div className="absolute bottom-3 left-3 right-3 bg-navy-900/85 backdrop-blur-sm text-slate-300 p-2 rounded text-[11px] border border-slate-700">
              <span className="text-cyan-400 font-semibold">Preview:</span> Cyan contours show the uploaded sketch's OpenCV edges for visual reference.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

