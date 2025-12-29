# Mike Cramblett's Novel Novel Generator (v0.4 Beta)

⚠️ **SECURITY WARNING:** This application is designed to run **locally** (localhost). It requires your Google Gemini API key to be exposed to the browser. **DO NOT** deploy this to a public web server (Vercel, Netlify, etc.) or your API key will be vulnerable to theft.

## Introduction

Hi! My name is Mike Cramblett. This is a beta of my **Novel Novel Generator**. It takes a simple prompt and turns it into a whole novel, but I've added a few specific architectural fixes to make the output actually good.

Notably, I developed a technique to give the main characters unique voices, and I also create a list of rolling pre-banned phrases that the model will only use once per novel to stop it from getting repetitive.

I used Google's Gemini models to build a TypeScript/React pipeline that automates the recursive stepwise generation. It requires your API key, but you can get one for free from Google as a developer.

## The Pipeline

The engine works as follows:

1.  **Ingest:** Reads Initial Prompt (IP) from the user.
2.  **Bible Generation:** Passes the IP to a specialized model to create a "Story Bible" (SB), describing the world, characters, etc.
3.  **SCI Injection:** Includes a specific linguistic fingerprint for each main character using a technique I developed called **Stylistic Compression Induction (SCI)**.
4.  **Outlining:** Passes the IP and SB to a "Master Planner" model to generate a chapter-by-chapter Outline.
5.  **Drafting:** Passes the IP, SB, and Outline to a "Master Writer" model. This step retrieves context from previous chapters and adheres to a "banned words" list from the previous iteration.
6.  **Auditing:** Passes the new chapter to a "Continuity Editor" model. This updates the running summary and hunts for "AI-isms" to add to the banned list for future chapters.
7.  **Loop:** Iterates steps 5 and 6 through the whole outline.
8.  **Export:** Packages the pipeline state to JSON and exports the final manuscript to PDF.

## Installation & "Quick" Start

I have a CS degree from Harvey Mudd and can totally write code, but I didn't really write this. I prompted a Gemini model to code it for me. I read the assistant's output and debugged it occasionally, but mostly I just prompted it like a junior coder.

Because of this, I never "installed" this in the traditional sense—it just ran in my browser via the AI Studio. However, since you are grabbing this from GitHub, you'll need to run it as a standard Node.js application.

**Prerequisites:** Node.js installed on your machine.

1.  **Clone or Download** this repository.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Set up your API Key:**
    *   Create a file named `.env.local` in the root folder.
    *   Add your key: `GEMINI_API_KEY=your_key_here`
4.  **Run it:**
    ```bash
    npm run dev
    ```
5.  Open the link shown in your terminal (usually `http://localhost:3000`).

**Usage:**
Type a prompt like *"Title: 'Mike is Cool', a story about a coder who invents an AI"* and hit **Weave My Novel**.

## General Usage Notes

*   **Prompting:** This is a one-prompt generator. The model is acting as a "Master Story Planner." It's not a doofus; it's helpful. You can paste entire chapters of novels, unfinished short stories, or just a title.
*   **Safety:** The "Fresh Novel" button has a confirmation step so you don't lose work.
*   **Recovery:** This is a beta. If the browser crashes, check the "Resume" button. I backup the pipeline to the browser's local storage after every step. I have recovered many novels this way.
*   **Backups:** You can save the current pipeline state to JSON or the text to PDF at any time.

## Future Improvements
Too many to list, but let's start with a real vector database implementation instead of the current keyword matcher, and maybe some better UI for the banned phrase list.

---
**Disclaimer:** This is a beta. Use at your own risk. Keep your API keys safe.