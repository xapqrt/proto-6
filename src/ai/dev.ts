'use server';

import '@/ai/flows/answer-question.ts';
import '@/ai/flows/generate-gemini-key.ts';
import '@/ai/flows/generate-notes.ts';
import '@/ai/flows/generate-flashcards.ts';
import '@/ai/flows/goal-breakdown-flow.ts';
import '@/ai/flows/summarize-content-flow.ts';
// Removed summarize-progress-flow import as it relies on Firestore data

// No need to export anything here as Genkit automatically picks up defined flows/prompts
// when the file is imported.

console.log("Genkit dev server loading flows...");
console.log("Loaded: answer-question");
console.log("Loaded: generate-gemini-key");
console.log("Loaded: generate-notes");
console.log("Loaded: generate-flashcards");
console.log("Loaded: goal-breakdown-flow");
console.log("Loaded: summarize-content-flow");
// console.log("Loaded: summarize-progress-flow"); // Log removed flow
