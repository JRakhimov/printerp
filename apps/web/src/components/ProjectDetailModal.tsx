import React, { useState, useEffect } from 'react';
import { useProject, useUpdateProject } from '../hooks/useProjects';
import { X, Box, ExternalLink, Clock, Layers, DollarSign, Calculator, Save, Loader2, Image as ImageIcon, MessageSquare } from 'lucide-react';

interface ProjectDetailModalProps {
  projectId: string | null;
  onClose: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ projectId, onClose }) => {
  const { data: project, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject();
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (project) {
      setNotes(project.notes || '');
    }
  }, [project]);

  if (!projectId) return null;

  const handleSaveNotes = async () => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        dto: { notes },
      });
      alert('Notes updated successfully!');
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  const profit = project ? project.defaultPrice - project.defaultCost : 0;
  const marginPercentage = project && project.defaultPrice > 0 ? Math.round((profit / project.defaultPrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        {isLoading || !project ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-400" />
                {project.name}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Model Photo Banner (if available) */}
            {project.imageUrl ? (
              <div className="relative w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                <img
                  src={project.imageUrl}
                  alt={project.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-24 bg-slate-950 rounded-xl border border-slate-800 border-dashed flex items-center justify-center text-slate-600 gap-2 text-xs">
                <ImageIcon className="w-4 h-4" />
                <span>No model image attached</span>
              </div>
            )}

            {/* Model Details & Links */}
            <div className="space-y-2">
              {project.description && (
                <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  {project.description}
                </p>
              )}

              {project.modelUrl && (
                <div className="pt-1">
                  <a
                    href={project.modelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open 3D Model Link (Thingiverse / Printables)</span>
                  </a>
                </div>
              )}
            </div>

            {/* Dimensions & Technical Specifications */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Print Time</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {project.printTimeMinutes
                    ? `${Math.floor(project.printTimeMinutes / 60)}h ${project.printTimeMinutes % 60}m`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Total Weight</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1 mt-0.5">
                  <Layers className="w-3 h-3 text-blue-400" />
                  {project.weightG}g
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Dimensions</span>
                <span className="font-semibold text-slate-200 block mt-0.5">
                  {project.sizeXMm && project.sizeYMm
                    ? `${project.sizeXMm}×${project.sizeYMm}${project.sizeZMm ? `×${project.sizeZMm}` : ''} mm`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Filament Consumption Breakdown */}
            <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/50 space-y-2">
              <span className="text-xs font-semibold text-slate-300">Filament Consumption</span>
              <div className="flex flex-wrap gap-1.5">
                {project.projectFilaments?.map((pf) => (
                  <span
                    key={pf.id}
                    className="inline-flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-xs text-slate-200"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: pf.filament?.color || '#3b82f6' }}
                    />
                    <span>
                      {pf.filament?.brand} {pf.filament?.name}
                    </span>
                    <strong className="text-white ml-1">{pf.grams}g</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Cost:</span>
                <span className="font-semibold text-slate-200">
                  {Number(project.defaultCost).toLocaleString('ru-RU')} сум
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Catalog Selling Price:</span>
                <span className="font-bold text-emerald-400">
                  {Number(project.defaultPrice).toLocaleString('ru-RU')} сум
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Estimated Profit & Margin:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  {profit.toLocaleString('ru-RU')} сум
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {marginPercentage}% margin
                  </span>
                </span>
              </div>
            </div>

            {/* Editable Comment / Notes Section */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                Comments & Printing Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Print settings, nozzle temp, recommended infill..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={updateProject.isPending}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition"
                >
                  {updateProject.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Comment</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
