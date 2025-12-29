import React from 'react';
import { BookText } from 'lucide-react';
import type { StoryBible } from '../types';

interface StoryBibleDisplayProps {
  bible: StoryBible;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="font-serif text-lg font-bold text-indigo-200 mt-4 mb-2">{title}</h4>
    <div className="prose prose-sm max-w-none prose-p:text-indigo-100">{children}</div>
  </div>
);

const StoryBibleDisplay: React.FC<StoryBibleDisplayProps> = ({ bible }) => {
  return (
    <div className="my-6 p-6 bg-indigo-900/30 border border-indigo-700 rounded-lg">
      <h3 className="text-2xl font-bold font-serif text-indigo-300 flex items-center gap-3 mb-4">
        <BookText size={28} />
        Story Bible
      </h3>
      
      <Section title="Characters">
        {bible.characters.map((char, i) => (
          <div key={i} className="mb-3 pl-4 border-l-2 border-indigo-600">
            <p><strong>{char.name}</strong></p>
            <p>{char.description}</p>
          </div>
        ))}
      </Section>
      
      <Section title="Engaging Conflict"><p>{bible.conflict}</p></Section>
      <Section title="Vivid Setting & World-Building"><p>{bible.setting}</p></Section>
      <Section title="Clear Theme"><p>{bible.theme}</p></Section>
      <Section title="Distinctive Voice & Style"><p>{bible.voiceAndStyle}</p></Section>
      <Section title="Sharp & Purposeful Dialogue"><p>{bible.dialogueStyle}</p></Section>
      <Section title="Satisfying Conclusion"><p>{bible.conclusion}</p></Section>
      <Section title="Originality"><p>{bible.originality}</p></Section>

    </div>
  );
};

export default StoryBibleDisplay;
