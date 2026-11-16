import React, { useState, useEffect } from 'react';
import { PreprocessResult, GenerationResult, ArchitecturalProject, AppConfig, ExampleCase, StudioPreset } from '../../types';
import { SketchUploader } from './SketchUploader';
import { PromptBuilderPanel } from './PromptBuilderPanel';
import { AdvancedControls } from './AdvancedControls';
import { GenerationProgress } from './GenerationProgress';
import { isLocalProvider } from '../../utils/provider';
import { ResultsView } from '../Results/ResultsView';
import { generateRender, preprocessSketchUrl } from '../../api/client';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface StudioProps {
  config: AppConfig | null;
  onOpenSettings: () => void;
  preset?: StudioPreset | null;
}

const DEFAULT_MATERIALS = 'Structural glass curtain walls, fair-faced concrete, timber accents';
const DEFAULT_PROMPT =
  'modern university academic block, glass windows, landscaped entrance, fair-faced concrete textures';

export const Studio: React.FC<StudioProps> = ({ config, onOpenSettings, preset }) => {
  // Sketch state (real edge map comes from the backend, never guessed URLs)
  const [currentSketch, setCurrentSketch] = useState<PreprocessResult | null>(null);
  const [isLoadingSketch, setIsLoadingSketch] = useState(false);
  const [sketchError, setSketchError] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | undefined>(preset?.title);

  // Architecture parameters
  const [style, setStyle] = useState(preset?.style || 'Modern Minimalist');
  const [buildingType, setBuildingType] = useState(preset?.category || 'University Building');
  const [lighting, setLighting] = useState(preset?.lighting || 'Morning');
  const [materials, setMaterials] = useState(preset?.materials || DEFAULT_MATERIALS);
  const [userPrompt, setUserPrompt] = useState(preset?.userPrompt || DEFAULT_PROMPT);

  // Advanced parameters
  const [controlnetStrength, setControlnetStrength] = useState(preset?.controlnetStrength ?? 0.7);
  const [denoisingStrength, setDenoisingStrength] = useState(preset?.denoisingStrength ?? 0.75);
  const [guidanceScale, setGuidanceScale] = useState(preset?.guidanceScale ?? 7.0);
  const [seed, setSeed] = useState(-1);
  const [resolution, setResolution] = useState('1024x768');
  // Negative prompt follows the compiled one (style- and model-specific) until the user edits it
  const [negativePrompt, setNegativePrompt] = useState('');
  const [negativeEdited, setNegativeEdited] = useState(false);
  // Manual override of the compiled prompt (null = use the automatic prompt)
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);

  // Generation execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ArchitecturalProject | null>(null);

  const loadSketchFromUrl = async (url: string) => {
    setIsLoadingSketch(true);
    setSketchError(null);
    try {
      setCurrentSketch(await preprocessSketchUrl(url));
    } catch (err: any) {
      setCurrentSketch(null);
      setSketchError(err.message || 'Could not load the sketch.');
    } finally {
      setIsLoadingSketch(false);
    }
  };

  // A sketch handed over from Examples / Projects is processed once when the Studio opens
  useEffect(() => {
    if (preset?.sketchUrl) loadSketchFromUrl(preset.sketchUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Picking a preloaded sketch configures the WHOLE studio for it: style, building type, lighting,
  // materials, description and tuned strengths. The compiled prompt then rebuilds automatically.
  const handleSelectExample = (ex: ExampleCase) => {
    setStyle(ex.style);
    setBuildingType(ex.category);
    setLighting(ex.lighting);
    setMaterials(ex.materials);
    setUserPrompt(ex.user_prompt);
    setControlnetStrength(ex.controlnet_strength);
    setDenoisingStrength(ex.denoising_strength);
    setGuidanceScale(ex.guidance_scale);
    setNegativeEdited(false);
    setManualPrompt(null);
    setProjectTitle(ex.title);
    setSeed(-1);
    loadSketchFromUrl(ex.sketch_url);
  };

  const handleGenerate = async (providerOverride?: string) => {
    setGenerationError(null);
    setIsGenerating(true);

    try {
      const res: GenerationResult = await generateRender({
        sketch_id: currentSketch?.sketch_id,
        sketch_url: currentSketch?.sketch_url,
        user_prompt: userPrompt,
        style,
        building_type: buildingType,
        lighting,
        materials,
        controlnet_strength: controlnetStrength,
        denoising_strength: denoisingStrength,
        guidance_scale: guidanceScale,
        seed,
        resolution,
        negative_prompt: negativeEdited ? negativePrompt : undefined,
        compiled_prompt: manualPrompt ?? undefined,
        provider: providerOverride,
        title: projectTitle || `${buildingType} — ${style}`,
      });

      setActiveProject(res.project);
    } catch (err: any) {
      setGenerationError(err.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* If result is ready, display Result View */}
      {activeProject ? (
        <ResultsView
          project={activeProject}
          onBackToStudio={() => setActiveProject(null)}
          onRegenerate={handleGenerate}
        />
      ) : (
        <div className="space-y-6">
          {/* Studio Workspace Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-canvas-200">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 font-sans">
                Architectural AI Studio
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Upload your concept sketch, choose style & lighting, and generate a realistic concept render.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${
                  config?.is_demo_mode
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                {config?.is_demo_mode ? 'Demo Engine (Offline Procedural)' : isLocalProvider(config) ? 'Local Stable Diffusion 1.5 + ControlNet' : 'Cloud GPU Diffusion'}
              </span>
            </div>
          </div>

          {/* 1. Sketch Uploader */}
          <SketchUploader
            currentSketch={currentSketch}
            onSketchProcessed={(res) => { setCurrentSketch(res); setSketchError(null); setProjectTitle(undefined); }}
            onClearSketch={() => setCurrentSketch(null)}
            onSelectExample={handleSelectExample}
            selectedSketchUrl={currentSketch?.sketch_url}
          />
          {isLoadingSketch && (
            <p className="text-xs text-slate-500 font-mono">Preparing sketch and edge map…</p>
          )}
          {sketchError && <p className="text-xs text-rose-700">{sketchError}</p>}

          {/* 2. Architectural Conditioning & Style Panel */}
          <PromptBuilderPanel
            style={style}
            onStyleChange={setStyle}
            buildingType={buildingType}
            onBuildingTypeChange={setBuildingType}
            lighting={lighting}
            onLightingChange={setLighting}
            materials={materials}
            onMaterialsChange={setMaterials}
            userPrompt={userPrompt}
            onUserPromptChange={setUserPrompt}
            provider={config?.default_provider}
            onCompiledPromptReady={(compiled, neg, manual) => {
              setManualPrompt(manual ? compiled : null);
              if (neg && !negativeEdited) setNegativePrompt(neg);
            }}
          />

          {/* 3. Advanced Diffusion Controls */}
          <AdvancedControls
            controlnetStrength={controlnetStrength}
            onControlnetStrengthChange={setControlnetStrength}
            denoisingStrength={denoisingStrength}
            onDenoisingStrengthChange={setDenoisingStrength}
            guidanceScale={guidanceScale}
            onGuidanceScaleChange={setGuidanceScale}
            seed={seed}
            isLocal={isLocalProvider(config)}
            onSeedChange={setSeed}
            resolution={resolution}
            onResolutionChange={setResolution}
            negativePrompt={negativePrompt}
            onNegativePromptChange={(v) => { setNegativePrompt(v); setNegativeEdited(true); }}
          />

          {/* Generation Progress Indicator */}
          {isGenerating && (
            <GenerationProgress
              isGenerating={isGenerating}
              providerLabel={config?.active_provider_label}
              isLocal={isLocalProvider(config)}
            />
          )}

          {/* Error notice */}
          {generationError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900 text-sm">AI Pipeline Error</p>
                  <p className="mt-0.5 leading-relaxed text-rose-800">{generationError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  className="px-3.5 py-2 rounded-lg bg-arch-blue text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="px-3.5 py-2 rounded-lg bg-white border border-rose-300 text-rose-900 font-semibold text-xs hover:bg-rose-100 transition-colors shadow-xs"
                >
                  Configure API Token
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerate('demo')}
                  className="px-3.5 py-2 rounded-lg bg-navy-900 text-white font-semibold text-xs hover:bg-navy-800 transition-colors shadow-xs"
                >
                  Run Demo Simulation
                </button>
              </div>
            </div>
          )}

          {/* Master Generate Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-navy-900 to-arch-blue hover:from-navy-800 hover:to-blue-700 shadow-elevated transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>Generating Render...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                  <span>Generate Campus Render</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

