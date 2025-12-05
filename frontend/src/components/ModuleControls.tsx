// Module Controls - Toggle switches for each module

import { useState } from "react";
import type { ModuleInfo } from "../types";

interface ModuleControlsProps {
  modules: ModuleInfo[];
  onToggle: (moduleId: string) => Promise<ModuleInfo>;
}

export function ModuleControls({ modules, onToggle }: ModuleControlsProps) {
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (moduleId: string) => {
    setToggling(moduleId);
    try {
      await onToggle(moduleId);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="bg-dark-panel rounded-lg p-6 border border-gray-800">
      <h2 className="text-2xl font-bold text-neon-green mb-4">Module Controls</h2>
      <div className="space-y-4">
        {modules.map((module) => (
          <div
            key={module.id}
            className="flex items-center justify-between p-4 bg-dark-bg rounded border border-gray-700 hover:border-neon-green transition-colors"
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{module.name}</h3>
              <p className="text-sm text-gray-400">{module.description}</p>
            </div>
            <button
              onClick={() => handleToggle(module.id)}
              disabled={toggling === module.id}
              className={`ml-4 px-4 py-2 rounded font-medium transition-all ${
                module.enabled
                  ? "bg-neon-green text-black hover:bg-green-400"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              } ${toggling === module.id ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {toggling === module.id ? "..." : module.enabled ? "ON" : "OFF"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
