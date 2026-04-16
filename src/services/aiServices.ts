import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from '@env';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const callGeminiAPI = async (prompt: string): Promise<string> => {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text.replace(/```json|```/g, "").trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to reach AI grading service");
  }
};