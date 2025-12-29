import React from 'react';
import { SlidersHorizontal, Wand2 } from 'lucide-react';

interface PromptFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  pageCount: number | string;
  setPageCount: (count: number | string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onCustomizeClick: () => void;
}

const PromptForm: React.FC<PromptFormProps> = ({ prompt, setPrompt, pageCount, setPageCount, onSubmit, isLoading, onCustomizeClick }) => {
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  
  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div>
        <label htmlFor="prompt" className="block text-lg font-medium text-sky-300 mb-2">
          Your Novel's Idea
        </label>
        <textarea
          id="prompt"
          rows={4}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow duration-200 placeholder-slate-500"
          placeholder="e.g., A detective in a cyberpunk city who discovers consciousness in the network while investigating a series of digital ghosts..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="pageCount" className="block text-sm font-medium text-slate-400 mb-2">
          Optional Page Count Target
        </label>
        <input
          type="number"
          id="pageCount"
          value={pageCount}
          onChange={(e) => setPageCount(e.target.value)}
          min="10"
          step="10"
          placeholder="e.g., 150"
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          disabled={isLoading}
        />
        <p className="text-xs text-slate-500 mt-2">
          Provide a target page count (~250 words/page) to guide the story length. Leave blank for the AI to determine the best length.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4">
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 shadow-lg"
        >
          <Wand2 size={22} />
          {isLoading ? 'Weaving...' : 'Weave My Novel'}
        </button>
         <button
          type="button"
          onClick={onCustomizeClick}
          className="text-sm text-slate-400 hover:text-sky-300 transition-colors flex items-center gap-2"
        >
          <SlidersHorizontal size={16} />
          Customize AI Prompts
        </button>
      </div>
    </form>
  );
};

export default PromptForm;
