import React, { useState, useEffect } from 'react';
import { projectsApi } from '@/lib/api/client';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = React.useCallback(async () => {
    try {
      const data = await projectsApi.list();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, refetch: fetchProjects };
}