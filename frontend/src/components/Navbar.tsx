import { engineBadge } from '../utils/provider';
import React from 'react';
import { ViewTab, AppConfig } from '../types';
import { Building2, Sparkles, Image as ImageIcon, FolderGit2, Settings, Cpu, Layers } from 'lucide-react';

interface NavbarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  config: AppConfig | null;
  onOpenSettings: () => void;
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  config,
  onOpenSettings,
  onOpenArchitecture,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-canvas-50/90 backdrop-blur-md border-b border-canvas-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => onTabChange('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-navy-900 to-arch-blue flex items-center justify-center text-white shadow-subtle group-hover:scale-105 transition-transform duration-200">
              <Building2 className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-navy-900 font-sans">
                  CampusVision<span className="text-arch-cyan">.ai</span>
                </span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-arch-muted -mt-0.5 font-medium hidden sm:block">
                Sketch-to-Render Campus Architecture
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('landing')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'landing'
                  ? 'text-navy-900 bg-canvas-200 font-semibold'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-canvas-100'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onTabChange('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'studio'
                  ? 'text-arch-blue bg-blue-50/80 font-semibold ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-canvas-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-arch-cyan" />
              AI Studio
            </button>
            <button
              onClick={() => onTabChange('examples')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'examples'
                  ? 'text-navy-900 bg-canvas-200 font-semibold'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-canvas-100'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-slate-500" />
              Example Gallery
            </button>
            <button
              onClick={() => onTabChange('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                currentTab === 'projects'
                  ? 'text-navy-900 bg-canvas-200 font-semibold'
                  : 'text-slate-600 hover:text-navy-900 hover:bg-canvas-100'
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-slate-500" />
              My Projects
            </button>
          </nav>

          {/* Action Pills & Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Architecture Pipeline Info Pill */}
            <button
              onClick={onOpenArchitecture}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-canvas-100 transition-colors shadow-sm"
              title="View OpenCV + ControlNet AI Architecture Pipeline"
            >
              <Layers className="w-3.5 h-3.5 text-arch-cyan" />
              <span>Pipeline: OpenCV + ControlNet</span>
            </button>

            {/* Provider Status Pill */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-all ${
                config?.is_demo_mode
                  ? 'bg-amber-50/80 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Click to choose the generation engine"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config?.is_demo_mode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="hidden sm:inline">
                {engineBadge(config)}
              </span>
              <Settings className="w-3 h-3 text-slate-400" />
            </button>

            {/* Primary Action Button */}
            {currentTab !== 'studio' && (
              <button
                onClick={() => onTabChange('studio')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 shadow-sm transition-all hover:shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                Launch Studio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sub-bar */}
      <div className="flex md:hidden border-t border-canvas-200 px-4 py-2 justify-around bg-canvas-100/50">
        <button
          onClick={() => onTabChange('landing')}
          className={`text-xs font-medium px-2 py-1 rounded ${currentTab === 'landing' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => onTabChange('studio')}
          className={`text-xs font-medium px-2 py-1 rounded flex items-center gap-1 ${currentTab === 'studio' ? 'bg-blue-50 text-arch-blue font-semibold ring-1 ring-blue-200' : 'text-slate-600'}`}
        >
          <Sparkles className="w-3 h-3 text-arch-cyan" /> Studio
        </button>
        <button
          onClick={() => onTabChange('examples')}
          className={`text-xs font-medium px-2 py-1 rounded ${currentTab === 'examples' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600'}`}
        >
          Examples
        </button>
        <button
          onClick={() => onTabChange('projects')}
          className={`text-xs font-medium px-2 py-1 rounded ${currentTab === 'projects' ? 'bg-white shadow-xs font-semibold' : 'text-slate-600'}`}
        >
          Projects
        </button>
      </div>
    </header>
  );
};

