import React from 'react';
import { ListTree } from 'lucide-react';
import type { NovelOutline } from '../types';

interface OutlineDisplayProps {
  outline: NovelOutline;
}

const OutlineDisplay: React.FC<OutlineDisplayProps> = ({ outline }) => {
    return (
        <div className="my-6 p-6 bg-teal-900/30 border border-teal-700 rounded-lg">
            <h3 className="text-2xl font-bold font-serif text-teal-300 flex items-center gap-3 mb-4">
                <ListTree size={28} />
                Novel Outline
            </h3>
            <div className="prose prose-invert max-w-none prose-p:text-teal-100 prose-headings:text-teal-200 prose-h4:font-serif prose-h4:text-teal-200">
                 <style>{`
                    .prose h4 {
                        font-size: 1.25rem;
                        margin-top: 1.5em;
                        margin-bottom: 0.5em;
                        font-weight: 700;
                    }
                    .prose p {
                        line-height: 1.6;
                    }
                `}</style>
                <h4>Overall Summary</h4>
                <p>{outline.summary}</p>
                
                <h4 className="mt-6">Chapters</h4>
                <div className="space-y-4">
                    {outline.chapters.map((chapter, i) => (
                        <div key={i} className="pl-4 border-l-2 border-teal-700">
                           <p><strong>{chapter.chapter_title}</strong></p>
                           <p className="text-sm text-teal-200">{chapter.chapter_summary}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OutlineDisplay;
