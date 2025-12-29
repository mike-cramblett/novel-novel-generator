
export interface ChapterOutline {
  chapter_title: string;
  chapter_summary: string;
}

export interface NovelOutline {
  title: string;
  summary: string;
  chapters: ChapterOutline[];
}

export interface CharacterProfile {
  name: string;
  description: string;
}

export interface StoryBible {
  characters: CharacterProfile[];
  conflict: string;
  setting: string;
  theme: string;
  voiceAndStyle: string;
  dialogueStyle: string;
  conclusion: string;
  originality: string;
}
