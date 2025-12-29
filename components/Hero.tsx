
import React from 'react';
import { Feather } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="text-center mb-10 md:mb-12">
      <div className="inline-block bg-sky-500/10 p-4 rounded-full border border-sky-800 mb-4">
          <Feather className="text-sky-400 h-10 w-10"/>
      </div>
      <h1 className="text-3xl md:text-5xl font-extrabold font-serif text-white tracking-tight leading-tight">
        Mike Cramblett's<br/>
        <span className="text-sky-400">Novel Novel Generator</span>
      </h1>
      <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400">
        Transform a single spark of an idea into a structurally sound manuscript. Our engine weaves a detailed Story Bible, crafts a cohesive outline, and pens every chapter with narrative continuity.
      </p>
    </div>
  );
};
