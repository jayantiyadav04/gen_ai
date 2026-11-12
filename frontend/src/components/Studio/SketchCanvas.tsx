import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Edit3, Eraser, RotateCcw, Trash2, Grid, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { PreprocessResult } from '../../types';
import { preprocessSketch } from '../../api/client';

interface SketchCanvasProps {
  onSketchDrawn: (res: PreprocessResult) => void;
  onCancel: () => void;
}

type ToolType = 'pen' | 'pencil' | 'marker' | 'eraser';

export const SketchCanvas: React.FC<SketchCanvasProps> = ({ onSketchDrawn, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<ToolType>('pen');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 1024;
    canvas.height = 768;

    // Fill warm vellum paper background
    ctx.fillStyle = '#FAF8F3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial blank state
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  }, []);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-10), data]); // keep last 10 states
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const prevState = newHistory[newHistory.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setHistory(newHistory);
    setStrokeCount((c) => Math.max(0, c - 1));
  };

  const handleClear = () => {
    if (!window.confirm('Clear your drawing canvas?')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FAF8F3';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setStrokeCount(0);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.strokeStyle = '#FAF8F3';
      ctx.lineWidth = strokeWidth * 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (tool === 'marker') {
      ctx.strokeStyle = 'rgba(70, 80, 95, 0.25)';
      ctx.lineWidth = strokeWidth * 3.5;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
    } else if (tool === 'pencil') {
      ctx.strokeStyle = '#383D48';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else {
      // Pen
      ctx.strokeStyle = '#1A1E29';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
      setStrokeCount((c) => c + 1);
    }
  };

  const handleUseSketch = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (strokeCount === 0) {
      alert('Please sketch a concept first on the drafting canvas.');
      return;
    }

    setIsSubmitting(true);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSubmitting(false);
        return;
      }
      try {
        const file = new File([blob], 'hand_drawn_sketch.png', { type: 'image/png' });
        const res = await preprocessSketch(file);
        onSketchDrawn(res);
      } catch (err: any) {
        alert(err.message || 'Failed to process hand-drawn sketch');
      } finally {
        setIsSubmitting(false);
      }
    }, 'image/png');
  };

  return (
    <div className="bg-white rounded-xl border border-canvas-300 shadow-elevated p-4 sm:p-5 space-y-4 animate-scale-up">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-canvas-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-white">
            <Edit3 className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-navy-900 font-sans">
              Interactive Architectural Sketchpad
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Draw concept elevations, floorplans, or massing directly on canvas
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-canvas-100 hover:bg-canvas-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUseSketch}
            disabled={isSubmitting || strokeCount === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>{isSubmitting ? 'Ingesting Sketch...' : 'Send to AI Studio'}</span>
          </button>
        </div>
      </div>

      {/* Tool & Stroke Palette */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas-100/70 p-2.5 rounded-lg border border-canvas-200 text-xs">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'pen' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Architectural Ink Pen"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draft Pen</span>
          </button>
          <button
            type="button"
            onClick={() => setTool('pencil')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'pencil' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="2B Concept Pencil"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>2B Pencil</span>
          </button>
          <button
            type="button"
            onClick={() => setTool('marker')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'marker' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Facade Shade Marker"
          >
            <span className="w-3 h-3 bg-slate-500 rounded-xs inline-block" />
            <span>Chisel Wash</span>
          </button>
          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 font-medium transition-colors ${
              tool === 'eraser' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 font-semibold">Stroke:</span>
          {[
            { label: 'Fine (2px)', width: 2 },
            { label: 'Med (4px)', width: 4 },
            { label: 'Bold (8px)', width: 8 }
          ].map((s) => (
            <button
              key={s.width}
              type="button"
              onClick={() => setStrokeWidth(s.width)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                strokeWidth === s.width
                  ? 'bg-navy-900 text-white border-navy-900 font-bold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Grid and History tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded border text-xs flex items-center gap-1 transition-colors ${
              showGrid ? 'bg-blue-50 border-blue-200 text-arch-blue font-semibold' : 'bg-white border-slate-200 text-slate-600'
            }`}
            title="Toggle Drafting Grid Guide"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[11px]">Grid</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            title="Undo stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded border border-slate-200 bg-white text-rose-600 hover:bg-rose-50"
            title="Clear Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive HTML5 Canvas Container */}
      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border-2 border-slate-300 bg-[#FAF8F3] shadow-inner select-none cursor-crosshair">
        {/* Visual Drafting Grid Overlay (Doesn't get drawn into the pixels) */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        )}

        {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full object-contain"
        />

        {/* Corner technical mark */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-black/40 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
          Interactive Canvas 1024×768 • Strokes: {strokeCount}
        </div>
      </div>
    </div>
  );
};
