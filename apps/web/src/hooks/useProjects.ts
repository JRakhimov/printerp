import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { CreateProjectDto, UpdateProjectDto } from '@printerp/shared';
import { Filament } from './useFilaments';

export interface ProjectFilamentItem {
  id: string;
  projectId: string;
  filamentId: string;
  grams: number;
  filament: Filament;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  modelUrl: string | null;
  imageUrl: string | null;
  sizeXMm: number | null;
  sizeYMm: number | null;
  sizeZMm: number | null;
  printTimeMinutes: number | null;
  defaultCost: number;
  defaultPrice: number;
  weightG: number;
  extraCost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  projectFilaments: ProjectFilamentItem[];
}

export function useProjects(search?: string) {
  return useQuery<Project[]>({
    queryKey: ['projects', { search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await apiClient.get<Project[]>(`/projects?${params.toString()}`);
      return res.data;
    },
  });
}

export function useProject(id: string | null) {
  return useQuery<Project>({
    queryKey: ['projects', id],
    queryFn: async () => {
      const res = await apiClient.get<Project>(`/projects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProjectDto) => {
      const res = await apiClient.post<Project>('/projects', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateProjectDto }) => {
      const res = await apiClient.patch<Project>(`/projects/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
