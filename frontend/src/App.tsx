import React, { useState, useEffect } from 'react';
import { ViewTab, AppConfig, ExampleCase, ArchitecturalProject } from './types';
import { getConfig } from './api/client';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { Studio } from './components/Studio/Studio';
import { ExampleGallery } from './components/Examples/ExampleGallery';
import { ProjectsGallery } from './components/Projects/ProjectsGallery';
import { SettingsModal } from './components/SettingsModal';
import { ArchitectureModal } from './components/ArchitectureModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('landing');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  // Studio preset state when navigating from examples or projects
  const [studioPreset, setStudioPreset] = useState<{
    sketchUrl?: string;
    title?: string;
    style?: string;
    category?: string;
  } | null>(null);

  useEffect(() => {
    getConfig()
      .then((cfg) => setConfig(cfg))
      .catch((err) => console.error('Config fetch failed:', err));
  }, []);

  const handleLoadExampleToStudio = (example: ExampleCase) => {
    setStudioPreset({
      sketchUrl: example.sketch_url,
      title: example.title,
      style: example.style,
      category: example.category,
    });
    setCurrentTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProjectInStudio = (project: ArchitecturalProject) => {
    setStudioPreset({
      sketchUrl: project.sketch_url,
      title: project.title,
      style: project.style,
      category: project.building_type,
    });
    setCurrentTab('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas-50 text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      {/* Sticky Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'studio' && currentTab !== 'studio') {
            // Keep preset or clear
          }
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        config={config}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      {/* Main Tab View */}
      <main className="flex-1">
        {currentTab === 'landing' && (
          <LandingPage
            onNavigate={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenArchitecture={() => setIsArchitectureOpen(true)}
          />
        )}

        {currentTab === 'studio' && (
          <Studio
            config={config}
            onOpenSettings={() => setIsSettingsOpen(true)}
            initialSketchUrl={studioPreset?.sketchUrl}
            initialTitle={studioPreset?.title}
            initialStyle={studioPreset?.style}
            initialCategory={studioPreset?.category}
          />
        )}

        {currentTab === 'examples' && (
          <ExampleGallery onLoadExampleToStudio={handleLoadExampleToStudio} />
        )}

        {currentTab === 'projects' && (
          <ProjectsGallery
            onOpenProjectInStudio={handleOpenProjectInStudio}
            onGoToStudio={() => {
              setStudioPreset(null);
              setCurrentTab('studio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Global Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onConfigUpdated={(newCfg) => setConfig(newCfg)}
      />

      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />
    </div>
  );
};

