import React from 'react';
import { ViewTab } from '../types';
import { ComparisonViewer } from './Comparison/ComparisonViewer';
import { Sparkles, ArrowRight, Building2, Layers, Cpu, ShieldCheck, CheckCircle2, ChevronRight, Eye, Sun, Compass } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (tab: ViewTab) => void;
  onOpenArchitecture: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenArchitecture }) => {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16 animate-fade-in">
      {/* 1. Hero Section */}
      <section className="relative pt-8 sm:pt-16 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero Left: Headline & Pitch */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Tag pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-mono font-semibold text-arch-blue">
              <span className="w-2 h-2 rounded-full bg-arch-cyan animate-pulse" />
              <span>Campus Facility Design • Image-to-Image Translation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-navy-900 font-sans leading-[1.1]">
              Sketch to <span className="text-transparent bg-clip-text bg-gradient-to-r from-arch-blue via-arch-cyan to-teal-500">Realistic Render</span> Campus Architecture
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Turn rough architectural elevations, building concepts, and campus masterplans
              into realistic concept renders with Stable Diffusion and ControlNet, preserving the structural geometry
              for university management, board reviews, and donor presentations.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('studio')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-navy-900 hover:bg-navy-800 shadow-elevated transition-all hover:scale-[1.02] group"
              >
                <Sparkles className="w-4 h-4 text-cyan-300 group-hover:rotate-12 transition-transform" />
                <span>Start Creating in Studio</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('examples')}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm text-navy-900 bg-white hover:bg-canvas-100 border border-slate-300 shadow-subtle transition-all"
              >
                <span>Explore Showcase Examples</span>
              </button>
            </div>

            {/* Feature validation pills */}
            <div className="pt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Structural Elevation Preservation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>OpenCV Canny Preprocessing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Concept-Quality Renders</span>
              </div>
            </div>
          </div>

          {/* Hero Right: Interactive Before-After Slider */}
          <div className="lg:col-span-6">
            <div className="relative">
              {/* Decorative architectural grid background */}
              <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-100/50 to-blue-100/40 rounded-2xl transform rotate-1 -z-10 blur-lg" />
              
              <ComparisonViewer
                originalUrl="/samples/sketches/academic_block_sketch.png"
                renderUrl="/samples/renders/academic_block_render.png"
                title="Modern Academic Complex (Drag slider to inspect transformation)"
                aspectRatio="aspect-[4/3]"
              />

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Interactive Split Slider Demo
                </span>
                <button
                  onClick={onOpenArchitecture}
                  className="text-arch-cyan hover:underline font-semibold"
                >
                  View AI Pipeline Diagram →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Problem Statement & University Value Proposition */}
      <section className="bg-canvas-100/70 border-y border-canvas-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-arch-cyan">
              The Real-World Challenge
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 font-sans">
              Built for Campus Planners & Educational Architects
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Campus development committees sketch new facilities daily, but turning these concepts into realistic renders for committee meetings and donor presentations traditionally requires weeks of 3D modeling. CampusVision AI gives a fast first concept image from a simple sketch.
            </p>
          </div>

          {/* Value cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-canvas-300 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-arch-blue flex items-center justify-center border border-blue-100">
                <Compass className="w-5 h-5 text-arch-cyan" />
              </div>
              <h3 className="text-base font-bold text-navy-900 font-sans">
                Preserve Original Geometry
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ControlNet conditioning locks in floor counts, column bays, and elevation contours from your original sketch without hallucinating impossible structures.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-canvas-300 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-arch-cyan flex items-center justify-center border border-cyan-100">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-navy-900 font-sans">
                Authentic Campus Context
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Synthesizes realistic lighting (golden hour, blue hour, daylight) alongside manicured lawns, mature shade trees, pedestrian pathways, and natural student activity.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-canvas-300 shadow-subtle space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-navy-900 font-sans">
                Board & Donor Presentation Ready
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate high-resolution visualizations suitable for university executive boards, capital campaign brochures, and architectural review committees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works (4-Step Workflow) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-arch-cyan">
            Generative AI Workflow
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-navy-900 font-sans">
            How CampusVision AI Operates
          </h2>
          <p className="text-sm text-slate-600">
            A 4-step image-to-image conditioning architecture engineered for structural fidelity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Upload Concept Sketch',
              desc: 'Upload any rough hand-drawn pencil elevation, pen draft, or digital concept drawing in PNG, JPG, or WebP.',
              badge: 'Input Sanitization',
            },
            {
              step: '02',
              title: 'OpenCV Feature Extraction',
              desc: 'Bilateral filtering removes noise while Canny edge detection isolates precise structural silhouette lines.',
              badge: 'Edge Conditioning',
            },
            {
              step: '03',
              title: 'Architectural Synthesis',
              desc: 'ControlNet conditions the diffusion latent space with your chosen materials, lighting, and architectural style.',
              badge: 'Diffusion Model',
            },
            {
              step: '04',
              title: 'Compare & Export',
              desc: 'Inspect transformations with interactive split sliders, verify edge alignment, and export high-res renders.',
              badge: 'Verification Suite',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white p-6 rounded-xl border border-canvas-300 shadow-subtle space-y-3 hover:border-arch-cyan transition-colors"
            >
              <span className="text-xs font-mono font-bold text-white bg-navy-900 px-2 py-0.5 rounded">
                STEP {item.step}
              </span>
              <h3 className="text-sm font-bold text-navy-900 font-sans pt-1">
                {item.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.desc}
              </p>
              <span className="inline-block text-[10px] font-mono text-arch-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Showcase Teaser Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-canvas-200">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-arch-cyan">
              Curated Demonstrations
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-navy-900 font-sans mt-0.5">
              Campus Typology Transformations
            </h2>
          </div>
          <button
            onClick={() => onNavigate('examples')}
            className="text-xs font-semibold text-arch-blue hover:underline flex items-center gap-1 font-mono"
          >
            View All 6 Case Studies <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Central University Library',
              style: 'Contemporary Glazed Atrium',
              sketch: '/samples/sketches/central_library_sketch.png',
              render: '/samples/renders/central_library_render.png',
            },
            {
              title: 'Biotech Innovation Hub',
              style: 'Sustainable Green Architecture',
              sketch: '/samples/sketches/biotech_hub_sketch.png',
              render: '/samples/renders/biotech_hub_render.png',
            },
            {
              title: 'Convocation Auditorium',
              style: 'Futuristic Parametric Shell',
              sketch: '/samples/sketches/auditorium_sketch.png',
              render: '/samples/renders/auditorium_render.png',
            },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => onNavigate('examples')}
              className="bg-white rounded-xl border border-canvas-300 shadow-subtle hover:shadow-elevated transition-all overflow-hidden cursor-pointer group"
            >
              <div className="aspect-[4/3] bg-slate-900 relative overflow-hidden">
                <img
                  src={item.render}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 bg-navy-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono">
                  {item.style}
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-navy-900 font-sans group-hover:text-arch-blue transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Click to inspect slider
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Master Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-arch-blue p-8 sm:p-12 text-white shadow-elevated relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 bg-white/10 px-2.5 py-1 rounded">
              Ready to Visualize
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-sans">
              Transform Your University Concept Sketch Today
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              Launch the architectural AI studio to upload sketches, customize facade materials,
              and diffuse high-fidelity renderings for your upcoming planning committee meeting.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => onNavigate('studio')}
                className="px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-navy-900 bg-white hover:bg-canvas-100 shadow-md transition-all hover:scale-102 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-arch-cyan" />
                <span>Launch Architectural AI Studio</span>
              </button>
              <button
                onClick={() => onNavigate('examples')}
                className="px-6 py-3 rounded-xl font-semibold text-xs sm:text-sm text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              >
                Explore Case Studies
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
