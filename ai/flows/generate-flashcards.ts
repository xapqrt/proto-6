
'use server';
/**
 * @fileOverview AI-powered flashcard generation from PDF content.
 *
 * - generateFlashcardsFromPdf - A function that generates flashcards from a PDF data URI.
 * - GenerateFlashcardsInput - The input type for the generateFlashcardsFromPdf function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcardsFromPdf function.
 * - Flashcard - Type definition for a single flashcard.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define schema for a single flashcard (internal, not exported)
const FlashcardSchema = z.object({
  question: z.string().describe('The question or term on the front of the flashcard.'),
  answer: z.string().describe('The answer or definition on the back of the flashcard.'),
});
export type Flashcard = z.infer<typeof FlashcardSchema>; // Export the type

// Define input schema (internal, not exported)
const GenerateFlashcardsInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The content of the PDF file, as a data URI that must include a MIME type (application/pdf) and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
   instructions: z
    .string()
    .optional()
    .describe('Optional custom instructions for the flashcard generation process (e.g., specific topics, difficulty).'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>; // Export the type

// Define output schema (internal, not exported)
const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe('An array of generated flashcards.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>; // Export the type

// Exported wrapper function
export async function generateFlashcardsFromPdf(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  console.log('[generateFlashcardsFromPdf] Received request. Validating input...');
  // Validate that the data URI is for a PDF
  if (!input.pdfDataUri || !input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
     console.error('[generateFlashcardsFromPdf] Invalid input: pdfDataUri is missing or not a base64 encoded PDF data URI.', input.pdfDataUri?.substring(0, 50));
    throw new Error('Invalid input: pdfDataUri must be a base64 encoded PDF data URI starting with "data:application/pdf;base64,".');
  }
   console.log('[generateFlashcardsFromPdf] Input validated. Calling generateFlashcardsFlow...');
  try {
      const result = await generateFlashcardsFlow(input);
      console.log(`[generateFlashcardsFromPdf] Flow completed successfully. Returning ${result.flashcards?.length ?? 0} cards.`);
      return result;
  } catch (error) {
       console.error('[generateFlashcardsFromPdf] Error calling generateFlashcardsFlow:', error);
       // Re-throw the error to be caught by the calling component
       throw error;
  }
}

// Define the prompt
const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {
    schema: GenerateFlashcardsInputSchema
  },
  output: {
    schema: GenerateFlashcardsOutputSchema,
    format: 'json' // Ensure the model outputs structured JSON
  },
  prompt: `You are an expert in creating effective study materials, specifically flashcards, from PDF documents.

  Analyze the provided PDF document and generate a comprehensive set of flashcards. Each flashcard MUST have a clear question/term on the front and a corresponding accurate answer/definition on the back.
  Focus on extracting **all** relevant key terms, definitions, concepts, important facts, and potential test questions found in the document.
  Generate as many high-quality flashcards as the content supports. Do not impose an artificial limit on the number of cards.

  {{#if instructions}}
  Follow these specific instructions: {{{instructions}}}
  {{else}}
  Generate flashcards covering all main points and important details of the document.
  {{/if}}

  PDF Content:
  {{media url=pdfDataUri}}

  Generate the flashcards now based on the PDF content and instructions. Ensure the output is an array of objects, each with a 'question' and 'answer' field. Respond ONLY with the JSON object containing the 'flashcards' array. Do not include any introductory text or markdown formatting around the JSON.
  `,
  // Specify the model capable of processing PDFs (Gemini 1.5 Flash or Pro)
  model: 'googleai/gemini-1.5-flash',
});

// Define the flow (internal, not exported directly for server actions)
const generateFlashcardsFlow = ai.defineFlow<
  typeof GenerateFlashcardsInputSchema,
  typeof GenerateFlashcardsOutputSchema
>({
  name: 'generateFlashcardsFlow',
  inputSchema: GenerateFlashcardsInputSchema,
  outputSchema: GenerateFlashcardsOutputSchema,
}, async (input) => {
  console.log('[generateFlashcardsFlow] Starting flow execution for PDF:', input.pdfDataUri.substring(0, 50) + "..."); // Log start

  try {
      console.log('[generateFlashcardsFlow] Calling AI prompt...');
      const {output, usage} = await prompt(input);
      console.log('[generateFlashcardsFlow] AI prompt call completed.');
      console.log('[generateFlashcardsFlow] Usage:', usage);


      // Validate the output structure
      if (!output || !Array.isArray(output.flashcards)) {
        console.error('[generateFlashcardsFlow] AI failed to return a valid response structure. Output received:', output);
        throw new Error("AI failed to generate flashcards. Output was missing or invalid (expected { flashcards: [...] }).");
      }

      // Validate individual flashcards (ensure both question and answer exist)
      const validFlashcards = output.flashcards.filter(card =>
          card &&
          typeof card.question === 'string' && card.question.trim() !== '' &&
          typeof card.answer === 'string' && card.answer.trim() !== ''
      );
      if (validFlashcards.length !== output.flashcards.length) {
          const invalidCount = output.flashcards.length - validFlashcards.length;
          console.warn(`[generateFlashcardsFlow] ${invalidCount} generated card(s) were invalid (missing question/answer) and filtered out. Original: ${output.flashcards.length}, Valid: ${validFlashcards.length}`);
      }


      console.log(`[generateFlashcardsFlow] Flashcards generation successful. Found ${validFlashcards.length} valid cards.`);
      return { flashcards: validFlashcards }; // Return only the valid cards

  } catch (error) {
      console.error('[generateFlashcardsFlow] Error during prompt execution:', error);
      // Check if the error is from the AI model itself (e.g., content filtering, API issues)
      // This might require inspecting the error object structure provided by Genkit/GoogleAI
      // if (error.isAiError) { ... }
      throw new Error(`AI prompt failed: ${error instanceof Error ? error.message : String(error)}`); // Re-throw a more specific error
  }
});

// IMPORTANT: Because this file uses 'use server', it CANNOT directly export the
// result of ai.defineFlow. We export the wrapper function `generateFlashcardsFromPdf` instead.
// The Genkit flow `generateFlashcardsFlow` is defined but only called internally by the wrapper.

