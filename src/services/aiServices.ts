import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '@env';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const callGeminiAPI = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash", 
      contents: prompt,
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    return text.replace(/```json|```/g, "").trim();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error?.message || "Failed to reach AI grading service");
  }
};