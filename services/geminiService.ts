
import { GoogleGenAI, Type } from "@google/genai";
import type { NovelOutline, StoryBible, ChapterOutline } from '../types';
import { vectorDB } from './vectorDbService';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility for exponential backoff retries
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Retry on 429 (Rate Limit) or 5xx (Server Error)
      const shouldRetry = err.status === 429 || (err.status >= 500 && err.status < 600);
      if (!shouldRetry || i === maxRetries - 1) break;
      
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      console.warn(`API error (${err.status}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

const storyBibleSchema = {
  type: Type.OBJECT,
  properties: {
    characters: {
      type: Type.ARRAY,
      description: "A list of main characters with their profiles.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The character's name." },
          description: { type: Type.STRING, description: "A detailed description of the character's personality, motivations, and arc." },
        },
        required: ["name", "description"],
      },
    },
    conflict: { type: Type.STRING, description: "The central conflict (internal and external) that drives the story and the stakes involved." },
    setting: { type: Type.STRING, description: "A description of the world, its atmosphere, and key locations, and how the setting impacts the story." },
    theme: { type: Type.STRING, description: "The central theme or message of the story." },
    voiceAndStyle: { type: Type.STRING, description: "The narrative voice (e.g., third-person limited) and overall writing style (e.g., gritty, lyrical)." },
    dialogueStyle: { type: Type.STRING, description: "The style of dialogue (e.g., witty, formal, subtext-heavy)." },
    conclusion: { type: Type.STRING, description: "The intended trajectory of the ending and how the central conflict will be resolved." },
    originality: { type: Type.STRING, description: "The unique twist, concept, or perspective that makes this story stand out." },
  },
  required: ["characters", "conflict", "setting", "theme", "voiceAndStyle", "dialogueStyle", "conclusion", "originality"],
};

const outlineSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A compelling and creative title for the novel.",
    },
    summary: {
      type: Type.STRING,
      description: "A brief, one-paragraph summary of the entire novel's plot.",
    },
    chapters: {
      type: Type.ARRAY,
      description: "A list of chapters that form the novel's structure.",
      items: {
        type: Type.OBJECT,
        properties: {
          chapter_title: {
            type: Type.STRING,
            description: "The title of this specific chapter.",
          },
          chapter_summary: {
            type: Type.STRING,
            description: "A detailed summary of this chapter's key events, character developments, and plot points.",
          },
        },
        required: ["chapter_title", "chapter_summary"],
      },
    },
  },
  required: ["title", "summary", "chapters"],
};

const summarySchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "The updated, concise plot summary incorporating the new chapter.",
    },
    identifiedAIisms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of overused phrases, repetitive sentence starts, or AI clichés found in the provided chapter text.",
    },
  },
  required: ["summary", "identifiedAIisms"],
};

export async function generateStoryBible(prompt: string, promptTemplate: string): Promise<StoryBible> {
  const model = 'gemini-3-flash-preview';
  const fullPrompt = promptTemplate.replace('{prompt}', prompt);
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: storyBibleSchema,
        temperature: 0.8,
      },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("Empty response from AI");
    return JSON.parse(jsonText) as StoryBible;
  });
}

export async function generateOutline(prompt: string, storyBible: StoryBible, pageCount: number, promptTemplate: string): Promise<NovelOutline> {
  const model = 'gemini-3-flash-preview';
  const storyBibleString = JSON.stringify(storyBible, null, 2);
  
  let lengthInstruction = '';
  if (pageCount > 0) {
    const wordCount = Number(pageCount) * 250; 
    lengthInstruction = ` The target length is approximately ${wordCount} words.`;
  }
  
  const fullPrompt = promptTemplate
    .replace('{prompt}', prompt)
    .replace('{storyBible}', storyBibleString)
    .replace('{lengthInstruction}', lengthInstruction);
  
  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: outlineSchema,
        temperature: 0.8,
      },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("Empty response from AI");
    return JSON.parse(jsonText) as NovelOutline;
  });
}

export async function* generateChapter(
  chapterOutline: ChapterOutline,
  storyBible: StoryBible,
  systemInstruction: string,
  runningSummary: string,
  chapterIndex: number,
  forbiddenPhrases: string[] = []
): AsyncGenerator<string, void, undefined> {
  const model = 'gemini-3-flash-preview';

  const queryText = `${chapterOutline.chapter_title} ${chapterOutline.chapter_summary}`;
  const contextDocs = await vectorDB.query(queryText, 2); 
  
  const retrievedContext = contextDocs.length > 0
    ? contextDocs
        .map(doc => `--- CONTEXT from ${doc.metadata.type} ${doc.metadata.chapter || ''} ---\n${doc.text}\n`)
        .join('\n')
    : "No specific documents were retrieved. Rely on the summary and story bible.";

  let previousChapterContext = '';
  if (chapterIndex > 0) {
      const prevChapterDoc = await vectorDB.getDocument(`chapter_${chapterIndex}`);
      if (prevChapterDoc) {
          previousChapterContext = `--- CONTEXT: Immediately Preceding Chapter (Chapter ${chapterIndex}) ---\n${prevChapterDoc.text}\n\n`;
      }
  }

  let dynamicContext = `--- CONTEXT: Running Plot Summary ---\n${runningSummary}\n\n${previousChapterContext}--- CONTEXT: Additional Retrieved Story Documents ---\n${retrievedContext}`;
  
  const characterDescriptions = storyBible.characters.map(c => `${c.name}: ${c.description}`).join('\n');

  const forbiddenBlock = forbiddenPhrases.length > 0 
    ? `\n**FORBIDDEN PHRASES & CONSTRAINTS:**\nDo not use the following overused phrases: ${forbiddenPhrases.join(', ')}.\nVary sentence starts. Avoid starting multiple sentences with "As he..." or "The [Noun]...".\n`
    : "";

  const prompt = `
You will write a chapter for a novel.
${forbiddenBlock}
**CORE STORY ELEMENTS (STORY BIBLE):**
- **Overall Theme**: ${storyBible.theme}
- **Narrative Voice & Writing Style**: ${storyBible.voiceAndStyle}
- **Setting**: ${storyBible.setting}
- **Main Characters**:
${characterDescriptions}

---

**DYNAMIC CONTEXT FROM STORY SO FAR:**
${dynamicContext}

---

**CURRENT CHAPTER TO WRITE:**
- **Chapter Title**: ${chapterOutline.chapter_title}
- **Chapter Summary/Goal**: ${chapterOutline.chapter_summary}

Based on all the information above, please write the full content for this chapter.
`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.75,
      },
    });

    for await (const chunk of responseStream) {
      if (chunk.text) yield chunk.text;
    }
  } catch (error) {
    console.error(`Error generating chapter "${chapterOutline.chapter_title}":`, error);
    throw new Error("Failed to generate a chapter from Gemini API.");
  }
}

export async function generateSummary(
  previousSummary: string, 
  newChapterText: string, 
  systemInstruction: string
): Promise<{ summary: string; identifiedAIisms: string[] }> {
  const model = 'gemini-3-flash-preview';
  const prompt = `
PREVIOUS SUMMARY:
${previousSummary}

---

NEW CHAPTER TEXT:
${newChapterText}

---

Based on the previous summary and the new chapter, please provide the updated summary and identify any linguistic patterns to avoid in the future.
`;

  return callWithRetry(async () => {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: summarySchema,
        temperature: 0.5,
      },
    });
    
    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("Empty response from AI");
    const result = JSON.parse(jsonText);
    return {
      summary: result.summary || "",
      identifiedAIisms: result.identifiedAIisms || []
    };
  });
}
