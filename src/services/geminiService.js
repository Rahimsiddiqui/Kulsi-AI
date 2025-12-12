import { GoogleGenAI, Type } from "@google/genai";

// Use Vite's import.meta.env for client-side environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize AI with API key if available
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Timeout for API calls
const API_TIMEOUT = 30000; // 30 seconds

export const generateNoteEnhancement = async (action, content, context) => {
  if (!apiKey || !ai) {
    throw new Error(
      "Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file."
    );
  }

  if (!content || typeof content !== "string") {
    throw new Error("Content must be a non-empty string");
  }

  const model = "gemini-2.5-flash";
  let prompt = "";

  switch (action) {
    case "summarize":
      prompt = `Summarize the following text concisely in Markdown format:\n\n${content}`;
      break;
    case "improve":
      prompt = `Rewrite the following text to be more professional, clear, and concise. Maintain the original meaning. Output in Markdown:\n\n${content}`;
      break;
    case "fix_grammar":
      prompt = `Fix any grammar and spelling errors in the following text. Do not change the style significantly. Output in Markdown:\n\n${content}`;
      break;
    case "continue":
      prompt = `Continue writing the following text creatively. Maintain the tone and style. Add about 100-200 words. Output in Markdown:\n\nContext: ${
        context || ""
      }\n\nCurrent Text: ${content}`;
      break;
    case "make_todo":
      prompt = `Extract action items from the text and format them as a Markdown checklist (- [ ] Item). If no clear actions exist, suggest some based on the content:\n\n${content}`;
      break;
    case "auto_tag":
      prompt = `Analyze the text and suggest 3-5 comma-separated tags (lowercase, single words) that best categorize this content:\n\n${content}`;
      break;
    case "make_flashcards":
      // This is handled by a separate function due to JSON requirement
      return "";
    default:
      throw new Error(`Unknown AI action: ${action}`);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    clearTimeout(timeoutId);

    if (!response || !response.text) {
      throw new Error("No response from AI service");
    }

    return response.text || "";
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("AI request timeout. Please try again.");
    }
    throw new Error(
      error.message || "Failed to generate AI content. Please try again."
    );
  }
};

export const generateFlashcards = async (content) => {
  if (!apiKey || !ai) {
    throw new Error(
      "Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file."
    );
  }

  if (!content || typeof content !== "string") {
    throw new Error("Content must be a non-empty string");
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create 5 study flashcards (Front/Back) from the following text. Make them concise and effective for learning. Return ONLY valid JSON array.\n\n${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
            },
            required: ["front", "back"],
          },
        },
      },
    });

    clearTimeout(timeoutId);

    if (!response || !response.text) {
      throw new Error("No response from AI service");
    }

    // Parse JSON response
    const text = response.text || "[]";
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }
      return parsed;
    } catch (parseError) {
      return [];
    }
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Flashcard generation timeout. Please try again.");
    }
    throw new Error(
      e.message || "Failed to generate flashcards. Please try again."
    );
  }
};
