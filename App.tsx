
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateStoryBible, generateOutline, generateChapter, generateSummary } from './services/geminiService';
import { exportNovelAsPDF, extractTextFromPDF } from './services/pdfService';
import type { NovelOutline, StoryBible } from './types';
import PromptForm from './components/PromptForm';
import LoadingIndicator from './components/LoadingIndicator';
import NovelDisplay from './components/NovelDisplay';
import { Hero } from './components/Hero';
import { AlertTriangle, BookOpen, Download, RefreshCw, BookText, ListTree, FilePlus, Upload, Archive, ShieldCheck, X, Ban } from 'lucide-react';
import PromptSettingsModal from './components/PromptSettingsModal';
import StoryBibleDisplay from './components/StoryBibleDisplay';
import OutlineDisplay from './components/OutlineDisplay';
import * as defaultPrompts from './prompts/defaultPrompts';
import { vectorDB } from './services/vectorDbService';
import * as storageService from './services/storageService';

export interface PromptsConfig {
  storyBible: string;
  outline: string;
  novelChapter: string;
  summary: string;
}

const APP_VERSION = "0.4 Beta";

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [pageCount, setPageCount] = useState<number | string>(150);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [novelTitle, setNovelTitle] = useState<string>('');
  const [novelContent, setNovelContent] = useState<string>('');
  const [storyBible, setStoryBible] = useState<StoryBible | null>(null);
  const [outline, setOutline] = useState<NovelOutline | null>(null);
  const [forbiddenPhrases, setForbiddenPhrases] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'bible' | 'outline' | 'banned' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExternal, setIsExternal] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [promptsConfig, setPromptsConfig] = useState<PromptsConfig>({
    storyBible: defaultPrompts.storyBiblePromptTemplate,
    outline: defaultPrompts.outlinePromptTemplate,
    novelChapter: defaultPrompts.novelChapterSystemInstruction,
    summary: defaultPrompts.summarySystemInstruction,
  });
  const [hasSavedState, setHasSavedState] = useState<boolean>(false);

  useEffect(() => {
    const checkState = async () => {
      const saved = await storageService.hasSavedState();
      setHasSavedState(saved);
    };
    checkState();
  }, []);

  const performReset = useCallback(async () => {
    try {
      setIsResetModalOpen(false);
      setIsLoading(true);
      setLoadingMessage('Resetting workshop...');
      
      await storageService.clearState();
      await vectorDB.clear();
      
      setHasSavedState(false);
      setNovelContent('');
      setNovelTitle('');
      setStoryBible(null);
      setOutline(null);
      setForbiddenPhrases([]);
      setIsExternal(false);
      setPrompt('');
      setInitialPrompt('');
      setError(null);
      setActiveView(null);
      setPageCount(150);
      
    } catch (err) {
      console.error("Cleanup error:", err);
      setError("An error occurred during reset. Some background data might persist.");
      setHasSavedState(false);
      setNovelContent('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStartNew = useCallback((skipConfirmation = false) => {
    if (!skipConfirmation && (hasSavedState || novelContent)) {
      setIsResetModalOpen(true);
      return;
    }
    performReset();
  }, [hasSavedState, novelContent, performReset]);

  const getSafeFilename = (title: string, suffix: string) => {
    const safeTitle = (title || 'untitled').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${safeTitle}_${suffix}`;
  };

  const downloadJSON = (content: object, filename: string) => {
    const jsonString = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackupPDF = async () => {
    setIsLoading(true);
    setLoadingMessage('Preparing PDF backup...');
    try {
      const title = await storageService.loadState<string>('novelTitle');
      const content = await storageService.loadState<string>('novelContent');
      const chapters = await storageService.loadState<string[]>('chapters');
      const finalContent = content || (chapters ? chapters.join('') : '');
      
      if (title && finalContent) {
        exportNovelAsPDF(title, finalContent);
      } else {
        setError("Insufficient data for PDF backup.");
      }
    } catch (err) {
      setError("Failed to generate PDF backup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupPipeline = async () => {
    setIsLoading(true);
    setLoadingMessage('Assembling pipeline backup...');
    try {
      const title = await storageService.loadState<string>('novelTitle');
      const pipelineData = {
        title: title || 'Unsaved Novel',
        initialPrompt: await storageService.loadState<string>('initialPrompt'),
        storyBible: await storageService.loadState<StoryBible>('storyBible'),
        novelOutline: await storageService.loadState<NovelOutline>('outline'),
        forbiddenPhrases: await storageService.loadState<string[]>('forbiddenPhrases'),
        novelManuscript: await storageService.loadState<string>('novelContent') || (await storageService.loadState<string[]>('chapters'))?.join(''),
      };
      downloadJSON(pipelineData, getSafeFilename(title || 'novel', 'pipeline_backup.json'));
    } catch (err) {
        setError("Failed to generate pipeline backup.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateNovel = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for your novel.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNovelContent('');
    setNovelTitle('');
    setStoryBible(null);
    setOutline(null);
    setForbiddenPhrases([]);
    setActiveView(null);
    setIsExternal(false);
    setInitialPrompt(prompt);
    await storageService.clearState();
    await storageService.saveState('initialPrompt', prompt);

    try {
      setLoadingMessage('Developing core story elements...');
      const storyBibleData: StoryBible = await generateStoryBible(prompt, promptsConfig.storyBible);
      setStoryBible(storyBibleData);
      await storageService.saveState('storyBible', storyBibleData);
      
      setLoadingMessage('Crafting a brilliant outline...');
      const numericPageCount = parseInt(String(pageCount), 10);
      const outlineData: NovelOutline = await generateOutline(prompt, storyBibleData, isNaN(numericPageCount) ? 0 : numericPageCount, promptsConfig.outline);
      setOutline(outlineData);
      setNovelTitle(outlineData.title);
      await storageService.saveState('outline', outlineData);
      await storageService.saveState('novelTitle', outlineData.title);
      setHasSavedState(true);

      setLoadingMessage('Preparing the writing desk...');
      await vectorDB.clear();
      await vectorDB.addDocument('story_bible', JSON.stringify(storyBibleData, null, 2), { type: 'story_bible' });
      
      const chapters: string[] = [];
      let currentSummary = outlineData.summary;
      let currentForbidden: string[] = [];
      await storageService.saveState('currentSummary', currentSummary);
      
      for (let i = 0; i < outlineData.chapters.length; i++) {
        const chapterOutline = outlineData.chapters[i];
        setLoadingMessage(`Penning Chapter ${i + 1} of ${outlineData.chapters.length}: ${chapterOutline.chapter_title}`);
        
        const chapterStream = generateChapter(
          chapterOutline, 
          storyBibleData, 
          promptsConfig.novelChapter,
          currentSummary,
          i,
          currentForbidden
        );
        
        let newChapterText = `Chapter ${i + 1}: ${chapterOutline.chapter_title}\n\n`;
        let chapterBody = '';

        for await (const chunk of chapterStream) {
          chapterBody += chunk;
          setNovelContent([...chapters, newChapterText + chapterBody].join(''));
        }
        
        newChapterText += chapterBody;
        newChapterText += '\n\n';
        chapters.push(newChapterText);
        setNovelContent(chapters.join(''));
        await storageService.saveState('chapters', chapters);

        await vectorDB.addDocument(`chapter_${i + 1}`, newChapterText, { type: 'chapter', chapter: i + 1 });
        
        setLoadingMessage(`Auditing Chapter ${i + 1}...`);
        const { summary: updatedSummary, identifiedAIisms } = await generateSummary(currentSummary, newChapterText, promptsConfig.summary);
        
        currentSummary = updatedSummary;
        const newForbidden = [...new Set([...currentForbidden, ...identifiedAIisms])];
        currentForbidden = newForbidden;
        
        setForbiddenPhrases(newForbidden);
        await storageService.saveState('currentSummary', updatedSummary);
        await storageService.saveState('forbiddenPhrases', newForbidden);
      }
      
      setLoadingMessage('Your first draft is complete!');

    } catch (err: any) {
      console.error(err);
      setError(`An error occurred: ${err.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, pageCount, promptsConfig]);

  const handleResumeNovel = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Resuming your masterpiece...');

    try {
        const initialP = await storageService.loadState<string>('initialPrompt');
        const bible = await storageService.loadState<StoryBible>('storyBible');
        const out = await storageService.loadState<NovelOutline>('outline');
        const title = await storageService.loadState<string>('novelTitle');
        const chaptersSoFar = await storageService.loadState<string[]>('chapters');
        const summary = await storageService.loadState<string>('currentSummary');
        const external = await storageService.loadState<boolean>('isExternal');
        const fullContent = await storageService.loadState<string>('novelContent');
        const savedForbidden = await storageService.loadState<string[]>('forbiddenPhrases') || [];

        setInitialPrompt(initialP || '');
        setForbiddenPhrases(savedForbidden);

        if(external) {
            setNovelContent(fullContent || '');
            setNovelTitle(title || 'External Document');
            setStoryBible(null);
            setOutline(null);
            setIsExternal(true);
            setHasSavedState(true);
            setIsLoading(false);
            return;
        }

        if (!bible || !out || !title) {
            throw new Error('Incomplete save data. Cannot resume.');
        }

        setStoryBible(bible);
        setOutline(out);
        setNovelTitle(title);
        setHasSavedState(true);
        const chapters = chaptersSoFar || [];
        setNovelContent(chapters.join(''));

        await vectorDB.clear();
        await vectorDB.addDocument('story_bible', JSON.stringify(bible, null, 2), { type: 'story_bible' });
        for(let i=0; i < chapters.length; i++) {
            await vectorDB.addDocument(`chapter_${i + 1}`, chapters[i], { type: 'chapter', chapter: i + 1 });
        }
        
        let currentSummary = summary || out.summary;
        let currentForbidden = savedForbidden;
        const startChapterIndex = chapters.length;

        if (startChapterIndex < out.chapters.length) {
            for (let i = startChapterIndex; i < out.chapters.length; i++) {
                const chapterOutline = out.chapters[i];
                setLoadingMessage(`Penning Chapter ${i + 1} of ${out.chapters.length}: ${chapterOutline.chapter_title}`);
                const chapterStream = generateChapter(chapterOutline, bible, promptsConfig.novelChapter, currentSummary, i, currentForbidden);
                let newChapterText = `Chapter ${i + 1}: ${chapterOutline.chapter_title}\n\n`;
                let chapterBody = '';
                for await (const chunk of chapterStream) {
                    chapterBody += chunk;
                    setNovelContent([...chapters, newChapterText + chapterBody].join(''));
                }
                newChapterText += chapterBody + '\n\n';
                chapters.push(newChapterText);
                await storageService.saveState('chapters', chapters);
                setNovelContent(chapters.join(''));
                await vectorDB.addDocument(`chapter_${i + 1}`, newChapterText, { type: 'chapter', chapter: i + 1 });
                
                setLoadingMessage(`Auditing Chapter ${i + 1}...`);
                const { summary: updatedSummary, identifiedAIisms } = await generateSummary(currentSummary, newChapterText, promptsConfig.summary);
                
                currentSummary = updatedSummary;
                const newForbidden = [...new Set([...currentForbidden, ...identifiedAIisms])];
                currentForbidden = newForbidden;
                
                setForbiddenPhrases(newForbidden);
                await storageService.saveState('currentSummary', updatedSummary);
                await storageService.saveState('forbiddenPhrases', newForbidden);
            }
        }
        
        setLoadingMessage('Your draft is complete!');
    } catch (err: any) {
        console.error(err);
        setError(`Failed to resume: ${err.message || 'Corrupted data'}. Starting fresh.`);
        handleStartNew(true);
    } finally {
        setIsLoading(false);
    }
  }, [promptsConfig, handleStartNew]);


  const handleDownload = () => {
    if (novelTitle && novelContent) {
      exportNovelAsPDF(novelTitle, novelContent);
    }
  };

  const toggleView = (view: 'bible' | 'outline' | 'banned') => {
    setActiveView(prev => prev === view ? null : view);
  };

  return (
    <>
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start">
              <div className="bg-red-500/10 p-3 rounded-full border border-red-500/30">
                <AlertTriangle className="text-red-500 w-8 h-8" />
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold font-serif text-white">Discard current work?</h3>
              <p className="text-slate-400 leading-relaxed">
                Starting a new novel will permanently delete your current progress from this browser's memory. This action is irreversible.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={performReset}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
              >
                Delete & Start Fresh
              </button>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-4 rounded-xl transition-all border border-slate-600"
              >
                Keep My Story
              </button>
            </div>
          </div>
        </div>
      )}

      <PromptSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        prompts={promptsConfig}
        onSave={setPromptsConfig}
      />
      
      <div className="min-h-screen bg-slate-900 text-slate-200">
        <main className="container mx-auto px-4 py-8 md:py-12">
          <Hero />

          <div className="max-w-3xl mx-auto bg-slate-800/50 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-sm min-h-[400px]">
            {!isLoading && novelContent && (
              <>
                <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4 flex-wrap gap-4">
                    <h2 className="text-3xl font-bold font-serif text-sky-300 flex items-center gap-3">
                      <BookOpen size={32}/>
                      {novelTitle}
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-5 rounded-lg transition-transform duration-200 hover:scale-105 shadow-lg"
                      >
                        <Download size={20} />
                        Download PDF
                      </button>
                    </div>
                </div>
                
                {!isExternal && (
                <div className="mb-6 p-4 bg-slate-900/30 border border-slate-700 rounded-lg">
                    <div className="flex justify-center items-center gap-3 flex-wrap">
                      {storyBible && (
                          <button onClick={() => toggleView('bible')} className="flex items-center gap-2 bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm">
                            <BookText size={18}/> {activeView === 'bible' ? 'Hide' : 'View'} Bible
                          </button>
                      )}
                       {outline && (
                          <button onClick={() => toggleView('outline')} className="flex items-center gap-2 bg-teal-600/80 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm">
                            <ListTree size={18}/> {activeView === 'outline' ? 'Hide' : 'View'} Outline
                          </button>
                      )}
                      {forbiddenPhrases.length > 0 && (
                          <button onClick={() => toggleView('banned')} className="flex items-center gap-2 bg-rose-600/80 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm">
                            <Ban size={18}/> {activeView === 'banned' ? 'Hide' : 'View'} Banned
                          </button>
                      )}
                       <button onClick={handleBackupPipeline} className="flex items-center gap-2 bg-purple-700/80 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 shadow-md text-sm">
                           <Archive size={18}/> Pipeline JSON
                       </button>
                    </div>
                </div>
                )}
                
                {activeView === 'bible' && storyBible && <StoryBibleDisplay bible={storyBible} />}
                {activeView === 'outline' && outline && <OutlineDisplay outline={outline} />}
                {activeView === 'banned' && (
                   <div className="my-6 p-6 bg-rose-900/30 border border-rose-700 rounded-xl animate-in fade-in duration-300">
                      <h3 className="text-xl font-bold font-serif text-rose-300 flex items-center gap-3 mb-4">
                        <Ban size={24} />
                        Banned Linguistic Patterns
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {forbiddenPhrases.map((phrase, i) => (
                          <span key={i} className="bg-rose-950/60 border border-rose-800 text-rose-200 px-3 py-1 rounded-full text-xs font-medium italic">
                            "{phrase}"
                          </span>
                        ))}
                      </div>
                   </div>
                )}
                <NovelDisplay content={novelContent} />

                <div className="text-center mt-6 pt-6 border-t border-slate-700 flex justify-center gap-4">
                   <button 
                      onClick={() => handleStartNew()} 
                      className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-lg transition-all duration-300 border border-slate-700"
                    >
                      <FilePlus size={20} /> New Novel
                    </button>
                </div>
              </>
            )}

            {!isLoading && !novelContent && (
              hasSavedState ? (
                 <div className="text-center space-y-8 py-10">
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold text-sky-300 font-serif tracking-tight">Welcome Back</h3>
                    <p className="text-slate-400 text-lg">Your manuscript is safe in the local workshop.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                      onClick={handleResumeNovel} 
                      className="flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
                    >
                      <RefreshCw size={22} /> Resume Writing
                    </button>
                    <button 
                      onClick={() => handleStartNew(false)} 
                      className="flex items-center justify-center gap-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-md text-lg"
                    >
                      <FilePlus size={22} /> Start Fresh
                    </button>
                  </div>

                  <div className="pt-8 border-t border-slate-700/50">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-5 flex items-center justify-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-500"/> Disaster Recovery
                    </h4>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button onClick={handleBackupPDF} className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 py-2.5 px-5 rounded-lg text-sm transition-colors border border-slate-700 group">
                        <Download size={16} className="group-hover:text-sky-400" /> Export PDF
                      </button>
                      <button onClick={handleBackupPipeline} className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 py-2.5 px-5 rounded-lg text-sm transition-colors border border-slate-700 group">
                        <Archive size={16} className="group-hover:text-purple-400" /> Export JSON
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <PromptForm
                    prompt={prompt}
                    setPrompt={setPrompt}
                    pageCount={pageCount}
                    setPageCount={setPageCount}
                    onSubmit={handleGenerateNovel}
                    isLoading={isLoading}
                    onCustomizeClick={() => setIsSettingsOpen(true)}
                  />
                </>
              )
            )}

            {isLoading && <LoadingIndicator message={loadingMessage} />}
            
            {error && (
              <div className="mt-8 p-5 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center gap-4 shadow-inner animate-in slide-in-from-bottom-4 duration-300">
                <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
                <p className="text-red-200 text-sm leading-relaxed">{error}</p>
              </div>
            )}
          </div>
          
          <footer className="text-center mt-16 text-slate-600 border-t border-slate-800 pt-8 pb-4">
            <p className="text-sm font-serif italic mb-1">NNG v{APP_VERSION} | Empowering Narrative Continuity</p>
            <p className="text-xs uppercase tracking-[0.2em] opacity-50">Mike Cramblett's Novel Novel Generator</p>
          </footer>
        </main>
      </div>
    </>
  );
};

export default App;
