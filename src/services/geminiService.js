import { GoogleGenAI, Type } from "@google/genai";

// Use Vite's import.meta.env for client-side environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize AI with API key if available
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateNoteEnhancement = async (action, content, context) => {
  if (!apiKey || !ai) {
    throw new Error(
      "Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file."
    );
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
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateFlashcards = async (content) => {
  if (!apiKey || !ai) {
    throw new Error(
      "Gemini API Key is not configured. Please set VITE_GEMINI_API_KEY in your .env file."
    );
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create 5 study flashcards (Front/Back) from the following text. Make them concise and effective for learning.\n\n${content}`,
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

    // Parse JSON response
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to generate flashcards", e);
    return [];
  }
};
