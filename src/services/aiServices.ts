import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '@env';
import ReactNativeBlobUtil from 'react-native-blob-util';
import type { Question } from '../types/firebase';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const GEMINI_MODEL = "gemini-3.8-flash";

export const callGeminiAPI = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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

export interface AssessmentSourceFile {
  uri: string;
  name: string;
  mimeType: string;
}

/** Where an extracted question's correct answer came from. */
export type AnswerSource = 'document' | 'ai' | 'none';

export type ExtractedQuestion = Question & { answerSource: AnswerSource };

// Inline requests are capped at ~20MB including the prompt.
const MAX_INLINE_BYTES = 18 * 1024 * 1024;

const EXTRACTION_PROMPT = `You are digitising a university test or exam for an online assessment platform.
Read every page of the attached file(s) and extract EVERY question, in order. Papers often have 30 or more questions; do not stop early or merge questions.

Return ONLY JSON in this exact shape:
{"questions":[{"type":"MCQ"|"TrueFalse"|"ShortAnswer","questionText":string,"options":string[],"correctAnswer":string,"answerSource":"document"|"ai"|"none"}]}

Rules:
- type "MCQ" when lettered/numbered options are given; "TrueFalse" for true/false questions; otherwise "ShortAnswer".
- options: the option texts WITHOUT their labels (drop "A.", "(b)", "iii)" etc.). TrueFalse options are exactly ["True","False"]. ShortAnswer options are [].
- Keep all mathematical, scientific and special symbols exactly, written as Unicode characters, never LaTeX or images: e.g. × ÷ ± ∓ √ ∛ π θ α β γ Δ λ μ σ Σ Ω ∞ ≈ ≠ ≤ ≥ ∫ ∂ ∑ ∏ → ⇌ ° ′ ″ ∈ ∉ ⊂ ∪ ∩ ∅ ∀ ∃ ¬ ∧ ∨ ⊕ and superscripts/subscripts like x², 10⁻³, H₂O, CO₂, ₙ.
- Write fractions as a/b, and keep chemical equations and units intact.
- correctAnswer is REQUIRED for every question:
  - If the document marks or lists the answer (answer key, ticked/bold/underlined option, "Ans:"), use it and set answerSource "document".
  - Otherwise work out the correct answer yourself and set answerSource "ai".
  - Only if a question genuinely cannot be answered (e.g. refers to a missing diagram), use "" and answerSource "none".
- For MCQ and TrueFalse, correctAnswer MUST be character-for-character identical to one of the options.
- For ShortAnswer, correctAnswer is the expected answer or key words, kept short.
- Ignore instructions, headers, page numbers, marks allocations and student-detail fields.
- If the file contains no questions, return {"questions":[]}.`;

const readAsBase64 = async (file: AssessmentSourceFile) => {
  // blob-util reads both file:// paths and Android content:// URIs.
  const path = file.uri.startsWith('file://')
    ? decodeURIComponent(file.uri.replace('file://', ''))
    : file.uri;
  return ReactNativeBlobUtil.fs.readFile(path, 'base64');
};

const tidy = (value: unknown) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const normalizeQuestion = (raw: any, index: number): ExtractedQuestion | null => {
  const questionText = tidy(raw?.questionText);
  if (!questionText) return null;

  let type: Question['type'] =
    raw?.type === 'MCQ' || raw?.type === 'TrueFalse' ? raw.type : 'ShortAnswer';
  let options: string[] = Array.isArray(raw?.options)
    ? raw.options.map(tidy).filter(Boolean)
    : [];
  if (type === 'TrueFalse') options = ['True', 'False'];
  if (type === 'MCQ' && options.length < 2) {
    type = 'ShortAnswer';
    options = [];
  }

  let correctAnswer = tidy(raw?.correctAnswer);
  let answerSource: AnswerSource =
    raw?.answerSource === 'document' || raw?.answerSource === 'ai'
      ? raw.answerSource
      : 'none';

  if (type !== 'ShortAnswer' && correctAnswer) {
    // Students' answers are compared to the option text exactly, so snap the
    // answer onto an option, accepting a bare letter ("B") as well.
    const exact = options.find(o => o === correctAnswer);
    const loose = options.find(
      o => o.toLowerCase() === correctAnswer.toLowerCase(),
    );
    const letterIndex = /^[A-Ha-h]$/.test(correctAnswer)
      ? correctAnswer.toUpperCase().charCodeAt(0) - 65
      : -1;
    correctAnswer =
      exact || loose || (letterIndex >= 0 ? options[letterIndex] ?? '' : '');
  }
  if (!correctAnswer) answerSource = 'none';

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    questionText,
    options,
    correctAnswer,
    answerSource,
  };
};

/**
 * Reads question papers (PDFs, photos of pages, text files) and returns the
 * questions with a correct answer for each, ready for the lecturer to review.
 */
export const extractAssessmentQuestions = async (
  files: AssessmentSourceFile[],
): Promise<ExtractedQuestion[]> => {
  if (files.length === 0) return [];

  const parts: any[] = [];
  let totalBytes = 0;
  for (const file of files) {
    const data = await readAsBase64(file);
    totalBytes += Math.ceil((data.length * 3) / 4);
    if (totalBytes > MAX_INLINE_BYTES) {
      throw new Error('These files are too large together. Use fewer pages or compress the PDF (max ~18MB).');
    }
    parts.push({ inlineData: { mimeType: file.mimeType, data } });
  }
  parts.push({ text: EXTRACTION_PROMPT });

  let text: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts }],
      config: { responseMimeType: 'application/json', temperature: 0.1 },
    });
    text = response.text;
  } catch (error: any) {
    console.error('Assessment extraction error:', error);
    throw new Error(error?.message || 'Could not reach the extraction service.');
  }
  if (!text) throw new Error('No questions could be read from these files.');

  let parsed: any;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('The extractor returned an unreadable result. Please try again.');
  }
  const rawQuestions = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .map(normalizeQuestion)
    .filter((q): q is ExtractedQuestion => q !== null);
};
