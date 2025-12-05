// Hook for managing module state

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../api/client";
import type { ModuleInfo } from "../types";

export function useModules() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch modules from API
  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getModules();
      setModules(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch modules"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle a module
  const toggleModule = useCallback(async (moduleId: string) => {
    try {
      const updatedModule = await apiClient.toggleModule(moduleId);
      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? updatedModule : m))
      );
      return updatedModule;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to toggle module"));
      throw err;
    }
  }, []);

  // Update a specific module (useful for event-driven updates)
  const updateModule = useCallback((updatedModule: ModuleInfo) => {
    setModules((prev) =>
      prev.map((m) => (m.id === updatedModule.id ? updatedModule : m))
    );
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return {
    modules,
    loading,
    error,
    toggleModule,
    updateModule,
    refetch: fetchModules,
  };
}
