// T3RRI AI talks to one low-level function - askDeckAI() - so the
// actual provider behind it can be swapped from an env var without
// touching any UI code.
//
// AI_API_BASE_URL currently points at a small unauthenticated backend
// with no published docs, SLA, or API key. That's fine to get T3RRI AI
// working today, but treat it as temporary: it can rate-limit, change
// shape, or disappear without notice, and prompts sent to it are
// leaving your infrastructure to an operator you don't control. When
// you're ready for something sturdier, point AI_API_BASE_URL at an
// official provider (OpenAI, Anthropic, etc.) instead - the rest of
// this file won't need to change, just the fetch below.

const DEFAULT_SYSTEM_PROMPT =
  "You are T3RRI AI, a concise coding assistant inside the T3RRI HUB app. Help the developer understand and improve the code they're working on.";

export async function askDeckAI(message, { systemPrompt, fileContext } = {}) {
  const baseUrl = process.env.AI_API_BASE_URL || "https://api-xbha.onrender.com";
  const prompt = fileContext
    ? `Current file:\n\`\`\`\n${fileContext.slice(0, 6000)}\n\`\`\`\n\nQuestion: ${message}`
    : message;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: prompt,
        instruction: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`AI provider returned ${res.status}`);
    const data = await res.json();
    if (!data?.text) throw new Error("AI provider returned no answer");
    return data.text;
  } catch (err) {
    console.error("T3RRI AI request failed:", err.message);
    return "T3RRI AI is temporarily unavailable. Please try again in a moment.";
  } finally {
    clearTimeout(timeout);
  }
}

// Quick-action prompts for the editor toolbar ("explain this file",
// "generate tests", ...). Each maps to a tailored instruction; the
// open file's content is sent as fileContext, same as normal chat.
const TOOL_PROMPTS = {
  explain: "Explain what this code does, in plain language, in a few short paragraphs.",
  refactor:
    "Suggest a refactor of this code for readability and maintainability. Show the improved code and briefly explain the key changes.",
  tests:
    "Write unit tests for this code, using whatever testing convention fits its language. Return just the test code plus a one-line note on how to run it.",
  docs:
    "Add documentation comments (JSDoc, docstrings, or the convention that fits this language) to this code. Return the fully documented version.",
  review:
    "Do a quick code review of this file: correctness issues first, then style/maintainability. Keep it to the highest-value points, not a nitpick list.",
  bugs: "Look for likely bugs or edge cases this code doesn't handle. List what you find, most serious first.",
  commitMessage:
    "Write a single-line, conventional-commits-style commit message summarizing this change. Return only the commit message line, nothing else.",
  rename:
    "Suggest a better filename for this file based on its content and the language's naming conventions. Return just the suggested filename and a one-sentence reason.",
};

export const AI_TOOL_MODES = Object.keys(TOOL_PROMPTS);

export async function askDeckAITool(mode, fileContext) {
  const instruction = TOOL_PROMPTS[mode];
  if (!instruction) throw new Error(`Unknown AI tool mode: ${mode}`);
  if (!fileContext?.trim()) throw new Error("No file content to work with");
  return askDeckAI(instruction, { fileContext });
}

/** Whole-project structure suggestions - takes a file path listing, not one file's content. */
export async function askDeckAIProjectStructure(filePaths) {
  if (!filePaths?.length) throw new Error("No files to analyze");
  const listing = filePaths.slice(0, 300).join("\n");
  return askDeckAI(
    `Here is the current file listing of a project:\n${listing}\n\nSuggest improvements to how it's organized (folder structure, naming, anything oddly placed). Keep it to the highest-value suggestions, not an exhaustive audit.`
  );
}
