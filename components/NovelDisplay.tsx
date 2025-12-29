import React from 'react';

interface NovelDisplayProps {
  content: string;
}

const NovelDisplay: React.FC<NovelDisplayProps> = ({ content }) => {
  // Split by paragraph breaks (one or more newlines) instead of just single newlines
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return (
    <div className="prose prose-invert max-w-none bg-slate-900/50 p-6 rounded-lg border border-slate-700 max-h-[60vh] overflow-y-auto">
      <style>{`
        .prose {
          color: #cbd5e1; /* slate-300 */
        }
        .prose h3 {
          color: #7dd3fc; /* sky-300 */
          font-family: 'Merriweather', serif;
        }
        .prose p {
          line-height: 1.7;
        }
      `}</style>
      {paragraphs.map((paragraph, index) => {
        // More flexible regex: case-insensitive, supports digits and roman numerals, and optional colon.
        if (paragraph.match(/^Chapter (\d+|[IVXLCDM]+):?/i)) {
          return (
            <h3 key={index} className="text-2xl font-bold mt-8 mb-4">
              {paragraph}
            </h3>
          );
        }
        return <p key={index}>{paragraph}</p>;
      })}
    </div>
  );
};

export default NovelDisplay;