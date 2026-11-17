import React, { useState, useEffect, useRef } from 'react';
import { PreprocessResult, GenerationResult, ArchitecturalProject, AppConfig, ExampleCase, StudioPreset } from '../../types';
import { SketchUploader } from './SketchUploader';
import { PromptBuilderPanel } from './PromptBuilderPanel';
import { CustomSketchPromptPanel } from './CustomSketchPromptPanel';
import { AdvancedControls } from './AdvancedControls';
import { GenerationProgress } from './GenerationProgress';
import { effectiveProvider, engineBadge, isLocalProvider } from '../../utils/provider';
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
const DEFAULT_CUSTOM_NEGATIVE =
  'low quality, blurry, distorted, deformed subject, duplicate subject, malformed features, text, watermark';

export const Studio: React.FC<StudioProps> = ({ config, onOpenSettings, preset }) => {
  // Sketch state (real edge map comes from the backend, never guessed URLs)
  const [currentSketch, setCurrentSketch] = useState<PreprocessResult | null>(null);
  const [isLoadingSketch, setIsLoadingSketch] = useState(false);
  const [sketchError, setSketchError] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string | undefined>(preset?.title);
  const [promptMode, setPromptMode] = useState<'architecture' | 'custom'>(preset?.promptMode || 'architecture');

  // Architecture parameters
  const [style, setStyle] = useState(preset?.style || 'Modern Minimalist');
  const [buildingType, setBuildingType] = useState(preset?.category || 'University Building');
  const [lighting, setLighting] = useState(preset?.lighting || 'Morning');
  const [materials, setMaterials] = useState(preset?.materials || DEFAULT_MATERIALS);
  const [userPrompt, setUserPrompt] = useState(preset?.userPrompt || DEFAULT_PROMPT);
  const [customPositivePrompt, setCustomPositivePrompt] = useState(
    preset?.promptMode === 'custom' ? preset.userPrompt || '' : ''
  );
  const [customNegativePrompt, setCustomNegativePrompt] = useState(
    preset?.promptMode === 'custom' ? preset.negativePrompt ?? DEFAULT_CUSTOM_NEGATIVE : DEFAULT_CUSTOM_NEGATIVE
  );

  // Advanced parameters
  const [controlnetStrength, setControlnetStrength] = useState(preset?.controlnetStrength ?? 0.7);
  const [denoisingStrength, setDenoisingStrength] = useState(preset?.denoisingStrength ?? 0.75);
  const [guidanceScale, setGuidanceScale] = useState(preset?.guidanceScale ?? 7.0);
  // Match the active ComfyUI Desktop workflow's initial seed. Users can still choose -1 to randomize.
  const [seed, setSeed] = useState(12345);
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
  const sketchLoadRequest = useRef(0);
  const generationInFlight = useRef(false);

  const loadSketchFromUrl = async (url: string) => {
    const requestId = ++sketchLoadRequest.current;
    setIsLoadingSketch(true);
    setSketchError(null);
    try {
      const sketch = await preprocessSketchUrl(url);
      if (requestId === sketchLoadRequest.current) setCurrentSketch(sketch);
    } catch (err: any) {
      if (requestId === sketchLoadRequest.current) {
        setCurrentSketch(null);
        setSketchError(err.message || 'Could not load the sketch.');
      }
    } finally {
      if (requestId === sketchLoadRequest.current) setIsLoadingSketch(false);
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
    setPromptMode('architecture');
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
    setSeed(12345);
    loadSketchFromUrl(ex.sketch_url);
  };

  const handleGenerate = async (providerOverride?: string) => {
    if (generationInFlight.current) return;
    if (promptMode === 'custom' && !customPositivePrompt.trim()) {
      setGenerationError('Enter a positive prompt describing what your custom sketch should become.');
      return;
    }
    generationInFlight.current = true;
    setGenerationError(null);
    setIsGenerating(true);

    try {
      const res: GenerationResult = await generateRender({
        sketch_id: currentSketch?.sketch_id,
        sketch_url: currentSketch?.sketch_url,
        prompt_mode: promptMode,
        user_prompt: promptMode === 'custom' ? customPositivePrompt.trim() : userPrompt,
        style: promptMode === 'custom' ? 'Custom' : style,
        building_type: promptMode === 'custom' ? 'Custom Sketch' : buildingType,
        lighting: promptMode === 'custom' ? 'User-directed' : lighting,
        materials: promptMode === 'custom' ? '' : materials,
        controlnet_strength: controlnetStrength,
        denoising_strength: denoisingStrength,
        guidance_scale: guidanceScale,
        seed,
        resolution,
        negative_prompt: promptMode === 'custom'
          ? customNegativePrompt
          : negativeEdited ? negativePrompt : undefined,
        compiled_prompt: promptMode === 'architecture' ? manualPrompt ?? undefined : undefined,
        provider: providerOverride,
        title: projectTitle || (promptMode === 'custom'
          ? `${customPositivePrompt.trim().slice(0, 48)} — Custom Sketch`
          : `${buildingType} — ${style}`),
      });

      setActiveProject(res.project);
    } catch (err: any) {
      setGenerationError(err.message || 'Generation failed. Please try again.');
    } finally {
      generationInFlight.current = false;
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
          isGenerating={isGenerating}
          generationError={generationError}
        />
      ) : (
        <div className="space-y-6">
          {/* Studio Workspace Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-canvas-200">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 font-sans">
                {promptMode === 'custom' ? 'Sketch-to-Image Studio' : 'Architectural AI Studio'}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                {promptMode === 'custom'
                  ? 'Draw or upload any subject, describe it, and generate an image guided by your sketch.'
                  : 'Upload your concept sketch, choose style & lighting, and generate a realistic concept render.'}
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
                {engineBadge(config)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-canvas-300 shadow-subtle p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-navy-900">What are you creating?</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Choose architecture presets or describe any custom subject.</p>
            </div>
            <div className="inline-flex p-1 bg-canvas-100 border border-slate-200 rounded-lg self-start sm:self-auto" role="group" aria-label="Sketch generation mode">
              <button
                type="button"
                aria-pressed={promptMode === 'architecture'}
                onClick={() => {
                  setPromptMode('architecture');
                  setNegativeEdited(false);
                  setManualPrompt(null);
                  if (promptMode !== 'architecture') setProjectTitle(undefined);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${promptMode === 'architecture' ? 'bg-navy-900 text-white shadow-xs' : 'text-slate-600 hover:text-navy-900'}`}
              >Architecture</button>
              <button
                type="button"
                aria-pressed={promptMode === 'custom'}
                onClick={() => {
                  setPromptMode('custom');
                  if (promptMode !== 'custom') setProjectTitle(undefined);
                }}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${promptMode === 'custom' ? 'bg-navy-900 text-white shadow-xs' : 'text-slate-600 hover:text-navy-900'}`}
              >Custom Sketch</button>
            </div>
          </div>

          {promptMode === 'custom' && config?.is_demo_mode && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
              Custom subjects need a diffusion model. If using Auto, make sure Local ComfyUI is running or configure a cloud provider. The Demo engine only makes procedural architecture images.
            </div>
          )}

          {/* 1. Sketch Uploader */}
          <SketchUploader
            currentSketch={currentSketch}
            onSketchProcessed={(res) => {
              sketchLoadRequest.current += 1;
              setIsLoadingSketch(false);
              setCurrentSketch(res);
              setSketchError(null);
              setProjectTitle(undefined);
            }}
            onClearSketch={() => {
              sketchLoadRequest.current += 1;
              setIsLoadingSketch(false);
              setCurrentSketch(null);
            }}
            onSelectExample={handleSelectExample}
            selectedSketchUrl={currentSketch?.sketch_url}
            isLocal={isLocalProvider(config)}
          />
          {isLoadingSketch && (
            <p className="text-xs text-slate-500 font-mono">Preparing sketch and edge map…</p>
          )}
          {sketchError && <p className="text-xs text-rose-700">{sketchError}</p>}

          {/* 2. Architecture presets or direct custom subject prompts */}
          {promptMode === 'architecture' ? <PromptBuilderPanel
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
          /> : (
            <CustomSketchPromptPanel
              positivePrompt={customPositivePrompt}
              onPositivePromptChange={(value) => { setCustomPositivePrompt(value); setProjectTitle(undefined); }}
              negativePrompt={customNegativePrompt}
              onNegativePromptChange={setCustomNegativePrompt}
            />
          )}

          {/* 3. Advanced Diffusion Controls */}
          <AdvancedControls
            controlnetStrength={controlnetStrength}
            onControlnetStrengthChange={setControlnetStrength}
            denoisingStrength={denoisingStrength}
            onDenoisingStrengthChange={setDenoisingStrength}
            guidanceScale={guidanceScale}
            onGuidanceScaleChange={setGuidanceScale}
            seed={seed}
            provider={effectiveProvider(config)}
            onSeedChange={setSeed}
            resolution={resolution}
            onResolutionChange={setResolution}
            negativePrompt={negativePrompt}
            onNegativePromptChange={(v) => { setNegativePrompt(v); setNegativeEdited(true); }}
            promptMode={promptMode}
          />

          {/* Generation Progress Indicator */}
          {isGenerating && (
            <GenerationProgress
              isGenerating={isGenerating}
              providerLabel={config?.active_provider_label}
              isLocal={isLocalProvider(config)}
              isDemo={config?.is_demo_mode}
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
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-lg bg-arch-blue text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-lg bg-white border border-rose-300 text-rose-900 font-semibold text-xs hover:bg-rose-100 transition-colors shadow-xs"
                >
                  Configure API Token
                </button>
                {promptMode === 'architecture' && <button
                  type="button"
                  onClick={() => handleGenerate('demo')}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-lg bg-navy-900 text-white font-semibold text-xs hover:bg-navy-800 transition-colors shadow-xs"
                >
                  Run Demo Simulation
                </button>}
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
                  <span>{promptMode === 'custom' ? 'Generate Image' : 'Generate Campus Render'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

