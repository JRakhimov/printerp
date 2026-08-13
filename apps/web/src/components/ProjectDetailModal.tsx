import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateProjectSchema, UpdateProjectDto } from '@printerp/shared';
import { useProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { useFilaments } from '../hooks/useFilaments';
import {
  X,
  Box,
  ExternalLink,
  Clock,
  Layers,
  DollarSign,
  Calculator,
  Save,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  Link as LinkIcon,
  Eye,
} from 'lucide-react';

interface ProjectDetailModalProps {
  projectId: string | null;
  initialMode?: 'view' | 'edit';
  onClose: () => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  projectId,
  initialMode = 'view',
  onClose,
}) => {
  const { data: project, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { data: filaments } = useFilaments();

  const [isEditing, setIsEditing] = useState<boolean>(initialMode === 'edit');
  const [selectedFilaments, setSelectedFilaments] = useState<{ filamentId: string; grams: number }[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UpdateProjectDto>({
    resolver: zodResolver(UpdateProjectSchema),
  });

  useEffect(() => {
    setIsEditing(initialMode === 'edit');
  }, [initialMode, projectId]);

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        modelUrl: project.modelUrl || '',
        imageUrl: project.imageUrl || '',
        defaultPrice: project.defaultPrice,
        extraCost: project.extraCost || 0,
        printTimeMinutes: project.printTimeMinutes || undefined,
        sizeXMm: project.sizeXMm || undefined,
        sizeYMm: project.sizeYMm || undefined,
        sizeZMm: project.sizeZMm || undefined,
        notes: project.notes || '',
      });

      if (project.projectFilaments) {
        setSelectedFilaments(
          project.projectFilaments.map((pf) => ({
            filamentId: pf.filamentId,
            grams: pf.grams,
          }))
        );
      }
    }
  }, [project, reset]);

  const watchedExtraCost = watch('extraCost') || 0;

  if (!projectId) return null;

  const addFilamentRow = () => {
    if (filaments && filaments.length > 0) {
      setSelectedFilaments([...selectedFilaments, { filamentId: filaments[0].id, grams: 50 }]);
    }
  };

  const removeFilamentRow = (index: number) => {
    setSelectedFilaments(selectedFilaments.filter((_, i) => i !== index));
  };

  const updateFilamentRow = (index: number, field: 'filamentId' | 'grams', value: string | number) => {
    const updated = [...selectedFilaments];
    if (field === 'filamentId') updated[index].filamentId = value as string;
    if (field === 'grams') updated[index].grams = Number(value) || 0;
    setSelectedFilaments(updated);
  };

  // Live client-side preview of automatic material cost
  const filamentMap = new Map((filaments || []).map((f) => [f.id, f]));
  let estimatedMaterialCost = 0;
  let estimatedWeight = 0;

  for (const item of selectedFilaments) {
    const fil = filamentMap.get(item.filamentId);
    if (fil) {
      estimatedWeight += item.grams;
      const costPerGram = Number(fil.costPerGram) || 0;
      estimatedMaterialCost += item.grams * costPerGram;
    }
  }

  const estimatedTotalCost = Math.round(estimatedMaterialCost) + Number(watchedExtraCost || 0);

  const onSubmitSave = async (data: UpdateProjectDto) => {
    if (!project) return;
    try {
      await updateProject.mutateAsync({
        id: project.id,
        dto: {
          ...data,
          modelUrl: data.modelUrl || null,
          imageUrl: data.imageUrl || null,
          notes: data.notes || null,
          filaments: selectedFilaments,
        },
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update project:', err);
      alert(err.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    if (window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      try {
        await deleteProject.mutateAsync(project.id);
        onClose();
      } catch (err: any) {
        console.error('Failed to delete project:', err);
        alert(err.response?.data?.message || 'Failed to delete project');
      }
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
                {isEditing ? 'Edit 3D Project Model' : project.name}
              </h3>
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Model</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Mode</span>
                  </button>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MODE 1: READ-ONLY VIEW MODE */}
            {!isEditing && (
              <div className="space-y-4">
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

                {/* Notes Section */}
                {project.notes && (
                  <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-indigo-400" />
                      Comments & Printing Notes
                    </span>
                    <p className="text-slate-200">{project.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: INLINE EDIT MODE */}
            {isEditing && (
              <form onSubmit={handleSubmit(onSubmitSave)} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Model Name *</label>
                  <input
                    {...register('name')}
                    placeholder="e.g. Articulated Dragon"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  {errors.name && <p className="text-[11px] text-red-400 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="Model description..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Links & Media Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                      3D Model Link (URL)
                    </label>
                    <input
                      {...register('modelUrl')}
                      placeholder="https://printables.com/..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Photo URL
                    </label>
                    <input
                      {...register('imageUrl')}
                      placeholder="https://imgur.com/photo.png"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Filament Consumption Rows */}
                <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      Filament Consumption
                    </label>
                    <button
                      type="button"
                      onClick={addFilamentRow}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Filament
                    </button>
                  </div>

                  {selectedFilaments.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No filaments added yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedFilaments.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <select
                            value={row.filamentId}
                            onChange={(e) => updateFilamentRow(idx, 'filamentId', e.target.value)}
                            className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white truncate focus:border-indigo-500 focus:outline-none"
                          >
                            {(filaments || []).map((fil) => (
                              <option key={fil.id} value={fil.id}>
                                {fil.brand} {fil.name} ({fil.material})
                              </option>
                            ))}
                          </select>

                          <div className="w-28 sm:w-32 shrink-0 flex items-center bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500">
                            <input
                              type="number"
                              value={row.grams}
                              onChange={(e) => updateFilamentRow(idx, 'grams', e.target.value)}
                              placeholder="Grams"
                              className="w-full min-w-0 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            <span className="text-[11px] font-semibold text-slate-400 ml-1 shrink-0">g</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFilamentRow(idx)}
                            className="text-slate-500 hover:text-red-400 p-1 shrink-0"
                            title="Remove Filament"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Metric preview box */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Total Weight: <strong className="text-white">{estimatedWeight}g</strong></span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calculator className="w-3 h-3 text-indigo-400" />
                      Est. Cost: <strong className="text-emerald-400">{estimatedTotalCost.toLocaleString('ru-RU')} сум</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Client Selling Price (сум) *</label>
                    <input
                      {...register('defaultPrice', { valueAsNumber: true })}
                      type="number"
                      placeholder="120000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    {errors.defaultPrice && <p className="text-[11px] text-red-400 mt-1">{errors.defaultPrice.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Extra Hardware Cost (сум)</label>
                    <input
                      {...register('extraCost', { valueAsNumber: true })}
                      type="number"
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Print Time (m)</label>
                    <input
                      {...register('printTimeMinutes', { valueAsNumber: true })}
                      type="number"
                      placeholder="240"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Size X (mm)</label>
                    <input
                      {...register('sizeXMm', { valueAsNumber: true })}
                      type="number"
                      placeholder="120"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Size Y (mm)</label>
                    <input
                      {...register('sizeYMm', { valueAsNumber: true })}
                      type="number"
                      placeholder="80"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Size Z (mm)</label>
                    <input
                      {...register('sizeZMm', { valueAsNumber: true })}
                      type="number"
                      placeholder="150"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Comments & Printing Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    placeholder="Print settings, infill, nozzle temp..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteProject.isPending}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1 transition"
                  >
                    {deleteProject.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateProject.isPending}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-md shadow-indigo-500/20"
                    >
                      {updateProject.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
