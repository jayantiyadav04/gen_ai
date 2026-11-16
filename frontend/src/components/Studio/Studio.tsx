import React, { useState } from 'react';
import { PreprocessResult, GenerationResult, ArchitecturalProject, AppConfig } from '../../types';
import { SketchUploader } from './SketchUploader';
import { PromptBuilderPanel } from './PromptBuilderPanel';
import { AdvancedControls } from './AdvancedControls';
import { GenerationProgress } from './GenerationProgress';
import { ResultsView } from '../Results/ResultsView';
import { generateRender } from '../../api/client';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface StudioProps {
  config: AppConfig | null;
  onOpenSettings: () => void;
  initialSketchUrl?: string;
  initialTitle?: string;
  initialStyle?: string;
  initialCategory?: string;
}

export const Studio: React.FC<StudioProps> = ({
  config,
  onOpenSettings,
  initialSketchUrl,
  initialTitle,
  initialStyle,
  initialCategory,
}) => {
  // Sketch state
  const [currentSketch, setCurrentSketch] = useState<PreprocessResult | null>(
    initialSketchUrl
      ? {
          sketch_id: 'sample_initial',
          filename: 'initial_sketch.png',
          sketch_url: initialSketchUrl,
          edge_url: initialSketchUrl.replace('_sketch', '_edge'),
          blueprint_url: initialSketchUrl,
          width: 1024,
          height: 768,
          edge_density: 0.08,
        }
      : null
  );

  // Architecture parameters
  const [style, setStyle] = useState(initialStyle || 'Modern Minimalist');
  const [buildingType, setBuildingType] = useState(initialCategory || 'University Building');
  const [lighting, setLighting] = useState('Morning');
  const [materials, setMaterials] = useState(
    'Structural glass curtain walls, fair-faced concrete, timber accents'
  );
  const [userPrompt, setUserPrompt] = useState(
    'Modern university academic block with glass windows, landscaped entrance, fair-faced concrete textures and morning sunlight.'
  );

  // Advanced parameters
  const [controlnetStrength, setControlnetStrength] = useState(0.8);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [resolution, setResolution] = useState('1024x768');
  const [negativePrompt, setNegativePrompt] = useState(config?.default_negative_prompt || '');

  // Generation execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<ArchitecturalProject | null>(null);

  // Handle sample selection from quick-picker
  const handleSelectSample = (url: string, title: string) => {
    setCurrentSketch({
      sketch_id: `sample_${Date.now()}`,
      filename: `${title}_sketch.png`,
      sketch_url: url,
      edge_url: url.replace('_sketch', '_edge'),
      blueprint_url: url,
      width: 1024,
      height: 768,
      edge_density: 0.08,
    });
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
        negative_prompt: negativePrompt,
        provider: providerOverride,
        title: `${buildingType} — ${style}`,
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
                Upload your concept sketch, configure style & lighting, and diffuse into board-ready photorealism.
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
                {config?.is_demo_mode ? 'Demo Engine (Offline Procedural)' : 'Live Cloud GPU Diffusion'}
              </span>
            </div>
          </div>

          {/* 1. Sketch Uploader */}
          <SketchUploader
            currentSketch={currentSketch}
            onSketchProcessed={(res) => setCurrentSketch(res)}
            onClearSketch={() => setCurrentSketch(null)}
            onSelectSampleSketch={handleSelectSample}
          />

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
            onCompiledPromptReady={(compiled, neg) => {
              if (neg && !negativePrompt) setNegativePrompt(neg);
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
            onSeedChange={setSeed}
            resolution={resolution}
            onResolutionChange={setResolution}
            negativePrompt={negativePrompt}
            onNegativePromptChange={setNegativePrompt}
          />

          {/* Generation Progress Indicator */}
          {isGenerating && (
            <GenerationProgress
              isGenerating={isGenerating}
              providerLabel={config?.active_provider_label}
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
                  <span>Synthesizing Architectural Render...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
                  <span>Generate Photorealistic Campus Render</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

