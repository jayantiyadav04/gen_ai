import React, { useState, useEffect } from 'react';
import { ExampleCase } from '../../types';
import { getExamples } from '../../api/client';
import { ComparisonViewer } from '../Comparison/ComparisonViewer';
import { Sparkles, ArrowRight, Building2, Sun, Layers, Compass, Loader2 } from 'lucide-react';

interface ExampleGalleryProps {
  onLoadExampleToStudio: (example: ExampleCase) => void;
}

export const ExampleGallery: React.FC<ExampleGalleryProps> = ({ onLoadExampleToStudio }) => {
  const [examples, setExamples] = useState<ExampleCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    getExamples()
      .then((data) => setExamples(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['All', 'University Building', 'Library', 'Research Laboratory', 'Auditorium', 'Student Hostel', 'Sports Complex'];

  const filtered = selectedCategory === 'All'
    ? examples
    : examples.filter((ex) => ex.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-canvas-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-arch-cyan bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              Architectural Benchmark Studies
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 font-sans">
            Campus Architectural Case Studies
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Explore authentic sketch-to-photoreal campus transformations. Each study preserves
            original structural elevations while diffusing ray-traced materials, landscape context, and lighting.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-canvas-100 text-slate-600 hover:text-navy-900 hover:bg-canvas-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-arch-cyan" />
          <span>Loading architectural case studies...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filtered.map((ex) => (
            <div
              key={ex.id}
              className="bg-white rounded-xl border border-canvas-300 shadow-subtle overflow-hidden flex flex-col hover:border-slate-400 transition-all"
            >
              {/* Comparison viewer */}
              <ComparisonViewer
                originalUrl={ex.sketch_url}
                renderUrl={ex.render_url}
                title={ex.title}
                aspectRatio="aspect-[16/10]"
              />

              {/* Case study metadata */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-arch-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {ex.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" /> {ex.lighting}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-navy-900 font-sans">
                    {ex.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ex.description}
                  </p>
                </div>

                <div className="bg-canvas-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Style:</span>
                    <span className="font-semibold text-navy-900">{ex.style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Materials:</span>
                    <span className="text-slate-700 truncate max-w-[240px]">{ex.materials}</span>
                  </div>
                </div>

                {/* Load into studio button */}
                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => onLoadExampleToStudio(ex)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-2xs transition-colors group"
                  >
                    <span>Load into Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-cyan-300" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

