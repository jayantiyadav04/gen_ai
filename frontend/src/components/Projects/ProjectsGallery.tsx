import React, { useState, useEffect } from 'react';
import { ArchitecturalProject } from '../../types';
import { getProjects, deleteProject, toggleFavorite } from '../../api/client';
import { ComparisonViewer } from '../Comparison/ComparisonViewer';
import { FullscreenModal } from '../Comparison/FullscreenModal';
import { Search, Filter, Trash2, Heart, ExternalLink, Calendar, Clock, Sparkles, FolderGit2, AlertCircle } from 'lucide-react';

interface ProjectsGalleryProps {
  onOpenProjectInStudio: (project: ArchitecturalProject) => void;
  onGoToStudio: () => void;
}

export const ProjectsGallery: React.FC<ProjectsGalleryProps> = ({
  onOpenProjectInStudio,
  onGoToStudio,
}) => {
  const [projects, setProjects] = useState<ArchitecturalProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [buildingType, setBuildingType] = useState('All');
  const [style, setStyle] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedForModal, setSelectedForModal] = useState<ArchitecturalProject | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects({
        search: search.trim() || undefined,
        building_type: buildingType,
        style: style,
        favorites_only: favoritesOnly,
      });
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, buildingType, style, favoritesOnly]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this architectural render from your gallery?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await toggleFavorite(id);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_favorite: res.is_favorite } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-canvas-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-arch-cyan bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
              Persistent Database
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 font-sans">
            My Campus Projects
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse and review your saved architectural visual transformations, metadata, and comparisons.
          </p>
        </div>

        <button
          onClick={onGoToStudio}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          Create New Render
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-canvas-300 shadow-subtle grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by title or prompt keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan"
          />
        </div>

        {/* Building Type Filter */}
        <select
          value={buildingType}
          onChange={(e) => setBuildingType(e.target.value)}
          className="px-3 py-2 bg-canvas-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-arch-cyan font-medium"
        >
          <option value="All">All Typologies</option>
          <option value="University Building">University Building</option>
          <option value="Library">Library</option>
          <option value="Auditorium">Auditorium</option>
          <option value="Research Laboratory">Research Laboratory</option>
          <option value="Sports Complex">Sports Complex</option>
          <option value="Student Hostel">Student Hostel</option>
        </select>

        {/* Favorites only toggle */}
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            favoritesOnly
              ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs'
              : 'bg-canvas-50 border-slate-200 text-slate-600 hover:bg-canvas-100'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>{favoritesOnly ? 'Favorites Only' : 'Show All'}</span>
        </button>
      </div>

      {/* Projects Grid or Empty State */}
      {loading ? (
        <div className="py-20 text-center text-xs font-mono text-slate-500 animate-pulse">
          Loading saved projects from database...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-canvas-300 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy-900 font-sans">
              No campus projects found
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {search || buildingType !== 'All' || favoritesOnly
                ? 'Try clearing your search filters to see all projects.'
                : 'Upload an architectural concept sketch in the studio to generate your first photoreal render.'}
            </p>
          </div>
          <button
            onClick={onGoToStudio}
            className="px-4 py-2 text-xs font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-lg shadow-sm transition-colors"
          >
            Launch AI Studio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => setSelectedForModal(proj)}
              className="bg-white rounded-xl border border-canvas-300 hover:border-arch-cyan shadow-subtle hover:shadow-elevated transition-all overflow-hidden cursor-pointer group flex flex-col justify-between"
            >
              {/* Thumbnail / Split preview */}
              <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                <img
                  src={proj.render_url}
                  alt={proj.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 bg-navy-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700">
                  {proj.style}
                </div>
                <button
                  onClick={(e) => handleToggleFav(proj.id, e)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-navy-900/70 backdrop-blur-sm text-white hover:bg-navy-900"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      proj.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-slate-300'
                    }`}
                  />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>{proj.building_type}</span>
                    <span>{proj.lighting}</span>
                  </div>
                  <h3 className="text-sm font-bold text-navy-900 font-sans group-hover:text-arch-blue transition-colors line-clamp-1">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {proj.user_prompt || proj.compiled_prompt}
                  </p>
                </div>

                {/* Footer metadata & actions */}
                <div className="pt-3 border-t border-canvas-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> {proj.inference_time_sec}s
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProjectInStudio(proj);
                      }}
                      className="text-xs font-semibold text-arch-cyan hover:underline flex items-center gap-0.5"
                    >
                      Open in Studio <ExternalLink className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(proj.id, e)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Inspector Modal if project clicked */}
      {selectedForModal && (
        <FullscreenModal
          isOpen={Boolean(selectedForModal)}
          onClose={() => setSelectedForModal(null)}
          originalUrl={selectedForModal.sketch_url}
          renderUrl={selectedForModal.render_url}
          edgeUrl={selectedForModal.edge_url}
          title={selectedForModal.title}
        />
      )}
    </div>
  );
};

