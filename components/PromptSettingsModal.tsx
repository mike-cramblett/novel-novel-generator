
import React, { useState, useEffect } from 'react';
import type { PromptsConfig } from '../App';
import { X } from 'lucide-react';

interface PromptSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptsConfig;
  onSave: (newPrompts: PromptsConfig) => void;
}

const PromptSettingsModal: React.FC<PromptSettingsModalProps> = ({ isOpen, onClose, prompts, onSave }) => {
  const [localPrompts, setLocalPrompts] = useState<PromptsConfig>(prompts);

  useEffect(() => {
    if (isOpen) {
      setLocalPrompts(prompts);
    }
  }, [prompts, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(localPrompts);
    onClose();
  };

  const handlePromptChange = (field: keyof PromptsConfig, value: string) => {
    setLocalPrompts(prev => ({ ...prev, [field]: value }));
  };

  const promptFields: { key: keyof PromptsConfig; label: string; description: string; }[] = [
    { key: 'storyBible', label: 'Story Bible Generation Prompt', description: 'This prompt instructs the AI on how to expand your core idea into a detailed "Story Bible" covering characters, conflict, setting, etc.' },
    { key: 'outline', label: 'Outline Generation Prompt', description: 'This prompt instructs the AI on how to structure the novel\'s outline based on your idea and the generated Story Bible.' },
    { key: 'novelChapter', label: 'Novel Chapter Generation System Instruction', description: 'This system instruction guides the AI in writing a single chapter based on an outline and retrieved context (RAG).' },
    { key: 'summary', label: 'Dynamic Summary System Instruction', description: 'This guides the AI in creating a running summary of the novel as it\'s being written.' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold font-serif text-sky-300">Customize Engine Prompts</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors" aria-label="Close settings">
            <X size={24} />
          </button>
        </header>

        <main className="p-6 space-y-6 overflow-y-auto">
          {promptFields.map(({ key, label, description }) => (
            <div key={key}>
              <label htmlFor={key} className="block text-lg font-medium text-sky-300 mb-1">
                {label}
              </label>
              <p className="text-sm text-slate-400 mb-2">{description}</p>
              <textarea
                id={key}
                rows={6}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200"
                value={localPrompts[key]}
                onChange={(e) => handlePromptChange(key, e.target.value)}
              />
            </div>
          ))}
        </main>

        <footer className="flex justify-end items-center p-6 border-t border-slate-700 mt-auto">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PromptSettingsModal;
