import React, { useState, useEffect } from 'react';
import { Sparkles, Sun, Building, Palette, Compass, Edit3, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { buildPrompt } from '../../api/client';

interface PromptBuilderPanelProps {
  style: string;
  onStyleChange: (s: string) => void;
  buildingType: string;
  onBuildingTypeChange: (bt: string) => void;
  lighting: string;
  onLightingChange: (l: string) => void;
  materials: string;
  onMaterialsChange: (m: string) => void;
  userPrompt: string;
  onUserPromptChange: (p: string) => void;
  onCompiledPromptReady: (compiled: string, negative: string) => void;
}

const STYLES = [
  { name: 'Modern Minimalist', tag: 'Miesian Glass & Concrete', icon: '🏛️' },
  { name: 'Contemporary', tag: 'Articulated Fins & Zinc', icon: '🏢' },
  { name: 'Neo-Classical', tag: 'Monumental Colonnade', icon: '🏛️' },
  { name: 'Sustainable / Green Architecture', tag: 'Biophilic Living Walls', icon: '🌿' },
  { name: 'Futuristic Parametric', tag: 'Fluid Aerodynamic Canopy', icon: '🚀' },
  { name: 'Traditional Indian Heritage', tag: 'Sandstone Jali & Haveli', icon: '🛕' },
  { name: 'Institutional Brutalist', tag: 'Board-marked Raw Concrete', icon: '🧱' },
];

const BUILDING_TYPES = [
  'University Building',
  'School Building',
  'Library',
  'Auditorium',
  'Research Laboratory',
  'Sports Complex',
  'Student Hostel',
  'Complete Campus Layout',
];

const LIGHTING_OPTIONS = [
  { name: 'Morning', tag: 'Crisp angled daylight, fresh atmosphere' },
  { name: 'Golden Hour', tag: 'Warm amber glow, glowing facade highlights' },
  { name: 'Bright Daylight', tag: 'Midday clarity, sharp crisp shadows' },
  { name: 'Sunset', tag: 'Terracotta & magenta horizon' },
  { name: 'Evening', tag: 'Blue hour dusk with warm interior glow' },
  { name: 'Night', tag: 'Dramatic exterior architectural illumination' },
];

const MATERIAL_PRESETS = [
  'Structural low-iron glass curtain walls, fair-faced white concrete, Accoya timber fins',
  'Agra red sandstone, carved buff Dholpur limestone, geometric jali sunscreens',
  'Lush biophilic living walls, cross-laminated timber, photovoltaic glass canopy',
  'Brushed titanium panels, double-glazed acoustic glass, exposed steel exoskeleton',
  'Exposed red clay brick masonry, deep concrete lintels, bronze window trims',
];

export const PromptBuilderPanel: React.FC<PromptBuilderPanelProps> = ({
  style,
  onStyleChange,
  buildingType,
  onBuildingTypeChange,
  lighting,
  onLightingChange,
  materials,
  onMaterialsChange,
  userPrompt,
  onUserPromptChange,
  onCompiledPromptReady,
}) => {
  const [compiledPrompt, setCompiledPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isEditingCompiled, setIsEditingCompiled] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(true);

  // Auto-recompile whenever options change
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await buildPrompt({
          user_prompt: userPrompt,
          style,
          building_type: buildingType,
          lighting,
          materials,
        });
        if (isMounted) {
          setCompiledPrompt(res.compiled_prompt);
          setNegativePrompt(res.negative_prompt);
          onCompiledPromptReady(res.compiled_prompt, res.negative_prompt);
        }
      } catch (err) {
        // Fallback local compilation if offline
        const localCompiled = `architectural visualization of a ${buildingType}, ${style}, ${userPrompt}, ${lighting} light, realistic, sharp focus, high detail`;
        if (isMounted) {
          setCompiledPrompt(localCompiled);
          onCompiledPromptReady(localCompiled, '');
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [userPrompt, style, buildingType, lighting, materials]);

  return (
    <div className="bg-white rounded-xl border border-canvas-300 shadow-subtle p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-navy-900 font-sans uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-arch-cyan" />
            2. Architectural Conditioning & Style
          </h3>
          <p className="text-xs text-slate-500">
            Define architectural typology, materials, and atmospheric lighting
          </p>
        </div>
      </div>

      {/* Architectural Style Selection Grid */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider flex items-center gap-1 font-sans">
          <Palette className="w-3.5 h-3.5 text-slate-500" />
          Architectural Style
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {STYLES.map((st) => {
            const isSelected = style === st.name;
            return (
              <button
                key={st.name}
                type="button"
                onClick={() => onStyleChange(st.name)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-arch-blue bg-blue-50/70 text-navy-900 shadow-xs ring-1 ring-blue-300'
                    : 'border-slate-200 hover:border-slate-300 bg-canvas-50 text-slate-700 hover:bg-canvas-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{st.icon}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-arch-blue font-bold" />}
                </div>
                <p className="text-xs font-bold leading-tight line-clamp-1">{st.name}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 font-mono">{st.tag}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Building Type & Lighting Selectors (Two columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Building Typology */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider flex items-center gap-1 font-sans">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            Building Category
          </label>
          <select
            value={buildingType}
            onChange={(e) => onBuildingTypeChange(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
          >
            {BUILDING_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        {/* Lighting & Environment */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider flex items-center gap-1 font-sans">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            Lighting & Atmosphere
          </label>
          <select
            value={lighting}
            onChange={(e) => onLightingChange(e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
          >
            {LIGHTING_OPTIONS.map((lt) => (
              <option key={lt.name} value={lt.name}>
                {lt.name} — {lt.tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials & Finishes */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider flex items-center justify-between font-sans">
          <span>Material Palette & Facade Finishes</span>
          <span className="text-[10px] text-slate-400 font-mono">Customizable</span>
        </label>
        <input
          type="text"
          value={materials}
          onChange={(e) => onMaterialsChange(e.target.value)}
          placeholder="e.g. Structural low-iron glass, fair-faced concrete, timber accents"
          className="w-full text-xs px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
        />

        {/* Quick material preset pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {MATERIAL_PRESETS.slice(0, 3).map((mp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onMaterialsChange(mp)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors truncate max-w-[280px]"
              title={mp}
            >
              + {mp.split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* User Vision Prompt Textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-navy-900 uppercase tracking-wider flex items-center justify-between font-sans">
          <span>Campus Design Vision (Specific Elements)</span>
          <span className="text-[10px] text-slate-400">Natural language</span>
        </label>
        <textarea
          rows={3}
          value={userPrompt}
          onChange={(e) => onUserPromptChange(e.target.value)}
          placeholder="e.g. Multi-tier academic block with floor-to-ceiling glass reading rooms, landscaped entrance plaza with stone fountain, flowering magnolia trees, and university students walking toward the main entrance."
          className="w-full text-xs p-3 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-arch-cyan leading-relaxed resize-none"
        />
      </div>

      {/* Live Architectural Prompt Compiler Preview */}
      <div className="bg-canvas-100/80 rounded-lg border border-canvas-300 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowPromptPreview(!showPromptPreview)}
            className="flex items-center gap-1.5 text-xs font-bold text-navy-900 font-sans tracking-wide uppercase"
          >
            <Sparkles className="w-3.5 h-3.5 text-arch-cyan" />
            <span>AI Prompt Compiler (Live Synthesis)</span>
            {showPromptPreview ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsEditingCompiled(!isEditingCompiled)}
            className="text-[11px] text-arch-cyan hover:underline flex items-center gap-1 font-mono font-medium"
          >
            <Edit3 className="w-3 h-3" />
            {isEditingCompiled ? 'Done Editing' : 'Manual Override'}
          </button>
        </div>

        {showPromptPreview && (
          <div>
            {isEditingCompiled ? (
              <textarea
                rows={4}
                value={compiledPrompt}
                onChange={(e) => {
                  setCompiledPrompt(e.target.value);
                  onCompiledPromptReady(e.target.value, negativePrompt);
                }}
                className="w-full text-[11px] font-mono p-2 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-arch-cyan leading-relaxed"
              />
            ) : (
              <p className="text-[11px] font-mono text-slate-700 bg-white/70 p-2.5 rounded border border-canvas-200 leading-relaxed max-h-24 overflow-y-auto">
                {compiledPrompt || 'Preparing prompt...'}
              </p>
            )}
            <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
              The prompt is kept short on purpose: Stable Diffusion 1.5 reads about 75 tokens, and the sketch edges control the shape.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

