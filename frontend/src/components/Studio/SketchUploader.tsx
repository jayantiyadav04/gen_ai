import React, { useState, useRef } from 'react';
import { PreprocessResult } from '../../types';
import { preprocessSketch } from '../../api/client';
import { SketchCanvas } from './SketchCanvas';
import { UploadCloud, Image as ImageIcon, Eye, Trash2, CheckCircle2, AlertCircle, Sparkles, Layers, Edit3 } from 'lucide-react';

interface SketchUploaderProps {
  onSketchProcessed: (res: PreprocessResult) => void;
  currentSketch: PreprocessResult | null;
  onClearSketch: () => void;
  onSelectSampleSketch: (sampleSketchUrl: string, sampleTitle: string) => void;
}

const SAMPLE_SKETCHES = [
  {
    title: 'Academic Block',
    url: '/samples/sketches/academic_block_sketch.png',
    type: 'University Building',
    style: 'Modern Minimalist'
  },
  {
    title: 'Central Library',
    url: '/samples/sketches/central_library_sketch.png',
    type: 'Library',
    style: 'Contemporary'
  },
  {
    title: 'Biotech Lab',
    url: '/samples/sketches/biotech_hub_sketch.png',
    type: 'Research Laboratory',
    style: 'Sustainable / Green Architecture'
  },
  {
    title: 'Auditorium Hall',
    url: '/samples/sketches/auditorium_sketch.png',
    type: 'Auditorium',
    style: 'Futuristic Parametric'
  },
  {
    title: 'Heritage Quad',
    url: '/samples/sketches/heritage_hall_sketch.png',
    type: 'Student Hostel',
    style: 'Traditional Indian Heritage'
  },
  {
    title: 'Sports Complex',
    url: '/samples/sketches/sports_arena_sketch.png',
    type: 'Sports Complex',
    style: 'Contemporary'
  }
];

export const SketchUploader: React.FC<SketchUploaderProps> = ({
  onSketchProcessed,
  currentSketch,
  onClearSketch,
  onSelectSampleSketch,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'sketch' | 'edge' | 'blueprint'>('sketch');
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setError('Please upload a valid image file (PNG, JPG, JPEG, or WebP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB limit.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await preprocessSketch(file);
      onSketchProcessed(res);
      setIsCanvasOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to process sketch.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  if (isCanvasOpen) {
    return (
      <SketchCanvas
        onSketchDrawn={(res) => {
          onSketchProcessed(res);
          setIsCanvasOpen(false);
        }}
        onCancel={() => setIsCanvasOpen(false)}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-canvas-300 shadow-subtle p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-navy-900 font-sans uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-arch-cyan" />
            1. Architectural Sketch Input
          </h3>
          <p className="text-xs text-slate-500">
            Upload a concept drawing, draw on the digital sketchpad, or choose a benchmark study
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!currentSketch && (
            <button
              type="button"
              onClick={() => setIsCanvasOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-arch-blue bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-arch-cyan" />
              <span>Draw on Digital Sketchpad</span>
            </button>
          )}

          {currentSketch && (
            <button
              onClick={onClearSketch}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors border border-rose-200"
            >
              <Trash2 className="w-3.5 h-3.5" /> Replace Sketch
            </button>
          )}
        </div>
      </div>

      {/* Upload Drop Zone or Active Preview */}
      {!currentSketch ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-arch-cyan bg-cyan-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-slate-400 bg-canvas-50/60 hover:bg-canvas-100/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-arch-blue shadow-xs">
              <UploadCloud className="w-6 h-6 text-arch-cyan" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                {isProcessing ? 'Processing with OpenCV...' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Hand-drawn concept, CAD elevation, or pen draft (PNG, JPG, WebP up to 20MB)
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCanvasOpen(true);
                }}
                className="text-xs font-semibold text-navy-900 bg-white hover:bg-canvas-100 border border-slate-300 px-3 py-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-arch-cyan" />
                <span>Or Open Drawing Canvas</span>
              </button>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-xs text-arch-cyan font-mono font-medium animate-pulse pt-2">
                <span className="w-2 h-2 rounded-full bg-arch-cyan animate-ping" />
                Extracting Canny edge contours & lineart...
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Preview with OpenCV Inspection Tabs */
        <div className="space-y-3">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between bg-canvas-100 p-1 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreviewTab('sketch')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  previewTab === 'sketch'
                    ? 'bg-white text-navy-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                Original Sketch
              </button>
              <button
                onClick={() => setPreviewTab('edge')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  previewTab === 'edge'
                    ? 'bg-navy-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                OpenCV Canny Edges
              </button>
              <button
                onClick={() => setPreviewTab('blueprint')}
                className={`px-3 py-1 rounded font-medium transition-colors ${
                  previewTab === 'blueprint'
                    ? 'bg-cyan-900 text-cyan-200 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-navy-900'
                }`}
              >
                Blueprint Inspector
              </button>
            </div>

            <span className="font-mono text-[10px] text-slate-500 hidden sm:inline px-2">
              {currentSketch.width} × {currentSketch.height} px
            </span>
          </div>

          {/* Active Preview Display */}
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center">
            {previewTab === 'sketch' && (
              <img
                src={currentSketch.sketch_url}
                alt="Uploaded Concept Sketch"
                className="w-full h-full object-contain"
              />
            )}
            {previewTab === 'edge' && (
              <img
                src={currentSketch.edge_url}
                alt="OpenCV Canny Edge Conditioning Map"
                className="w-full h-full object-contain"
              />
            )}
            {previewTab === 'blueprint' && (
              <img
                src={currentSketch.blueprint_url}
                alt="Architectural Blueprint Analysis Map"
                className="w-full h-full object-contain"
              />
            )}

            {/* Indicator badge */}
            <div className="absolute bottom-2.5 left-2.5 bg-navy-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Structural conditioning ready ({Math.round(currentSketch.edge_density * 1000) / 10}% line density)</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quick-Pick Sample Sketches */}
      <div className="pt-2 border-t border-canvas-200">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2 font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-arch-cyan" />
          Or load an architectural benchmark drawing:
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SAMPLE_SKETCHES.map((sample) => (
            <button
              key={sample.title}
              onClick={() => onSelectSampleSketch(sample.url, sample.title)}
              className="text-left p-1.5 rounded-lg border border-slate-200 hover:border-arch-cyan bg-canvas-50 hover:bg-white transition-all group shadow-2xs"
            >
              <div className="aspect-[4/3] rounded bg-slate-100 overflow-hidden mb-1 border border-slate-200">
                <img
                  src={sample.url}
                  alt={sample.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <p className="text-[11px] font-bold text-slate-800 truncate">{sample.title}</p>
              <p className="text-[9px] text-slate-500 truncate">{sample.type}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
