import React, { useState } from 'react';
import { useProjects, useDeleteProject, Project } from '../hooks/useProjects';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { Box, Plus, Layers, Search, Clock, Trash2, Loader2, DollarSign, ExternalLink, Image as ImageIcon, Pencil } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModalMode, setProjectModalMode] = useState<'view' | 'edit'>('view');

  const { data: projects, isLoading } = useProjects(search);
  const deleteProject = useDeleteProject();

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete project "${name}"?`)) {
      await deleteProject.mutateAsync(id);
    }
  };

  const handleOpenDetail = (id: string, mode: 'view' | 'edit' = 'view') => {
    setSelectedProjectId(id);
    setProjectModalMode(mode);
  };

  const handleEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    handleOpenDetail(id, 'edit');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header action bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Box className="w-5 h-5 text-indigo-400" />
          3D Projects Catalog
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Model</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models by name or description..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && projects?.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
          <Box className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">No 3D projects found</p>
          <p className="text-xs text-slate-500">Create your first 3D print model to enable order estimates.</p>
        </div>
      )}

      {/* Dynamic Projects Catalog List */}
      <div className="space-y-3">
        {projects?.map((project) => (
          <div
            key={project.id}
            onClick={() => handleOpenDetail(project.id, 'view')}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              {project.imageUrl && (
                <img
                  src={project.imageUrl}
                  alt={project.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-800 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">{project.name}</h3>
                  {project.modelUrl && (
                    <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
                  )}
                </div>
                {project.description && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{project.description}</p>
                )}
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                  {Number(project.defaultPrice).toLocaleString('ru-RU')} сум
                </span>
                <button
                  onClick={(e) => handleEdit(e, project.id)}
                  className="text-slate-400 hover:text-indigo-400 p-1"
                  title="Edit Model"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, project.id, project.name)}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Delete Model"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filament Breakdown list */}
            {project.projectFilaments && project.projectFilaments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.projectFilaments.map((pf) => (
                  <span
                    key={pf.id}
                    className="inline-flex items-center space-x-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] text-slate-300"
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: pf.filament?.color || '#3b82f6' }}
                    />
                    <span>{pf.filament?.name || 'Filament'}</span>
                    <strong className="text-slate-100">{pf.grams}g</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Financials & Print Time summary */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center gap-1 text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  {project.weightG}g total
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Cost: <strong className="text-white">{Number(project.defaultCost).toLocaleString('ru-RU')} сум</strong>
                </span>
              </div>
              {project.printTimeMinutes && (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {Math.floor(project.printTimeMinutes / 60)}h {project.printTimeMinutes % 60}m
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <ProjectDetailModal
        projectId={selectedProjectId}
        initialMode={projectModalMode}
        onClose={() => setSelectedProjectId(null)}
      />
    </div>
  );
};
