'use server';
/**
 * @fileOverview AI-powered note generation from PDF content.
 *
 * - generateNotesFromPdf - A function that generates study notes from a PDF data URI.
 * - GenerateNotesInput - The input type for the generateNotesFromPdf function.
 * - GenerateNotesOutput - The return type for the generateNotesFromPdf function.
 * - NoteData - The structured data type for generated notes.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import type { NoteData } from '@/types'; // Import the structured NoteData type

// Define input schema (internal, not exported)
const GenerateNotesInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "The content of the PDF file, as a data URI that must include a MIME type (application/pdf) and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
   instructions: z
    .string()
    .optional()
    .describe('Optional custom instructions for the note generation process (e.g., focus areas, desired format, specific tags/category).'),
});
export type GenerateNotesInput = z.infer<typeof GenerateNotesInputSchema>; // Export the type

// Define output schema to match NoteData structure (internal, not exported)
const GenerateNotesOutputSchema = z.object({
  content: z.string().describe('The generated study notes in markdown format.'),
  tags: z.array(z.string()).describe('Suggested relevant tags for the notes (e.g., ["Physics", "Quantum Mechanics", "Chapter 3"]). Generate 3-5 relevant tags.'),
  category: z.string().describe('A suggested single primary category for the notes (e.g., "Physics", "Lecture Summary", "Study Guide").'),
});
// Output type aligns with the main part of NoteData, generatedAt is added later
export type GenerateNotesOutput = z.infer<typeof GenerateNotesOutputSchema>; // Export the type

// Exported wrapper function returns the full NoteData structure
export async function generateNotesFromPdf(input: GenerateNotesInput): Promise<NoteData> {
  // Validate that the data URI is for a PDF
  if (!input.pdfDataUri || !input.pdfDataUri.startsWith('data:application/pdf;base64,')) {
    throw new Error('Invalid input: pdfDataUri must be a base64 encoded PDF data URI starting with "data:application/pdf;base64,".');
  }
  console.log('[generateNotesFromPdf] Input validated. Calling generateNotesFlow...');
  try {
      const result = await generateNotesFlow(input);
      console.log('[generateNotesFromPdf] Flow completed successfully.');
      // Add timestamp and return the full NoteData object
      const fullNoteData: NoteData = {
        ...result,
        generatedAt: Date.now(),
      };
      return fullNoteData;
  } catch (error) {
      console.error('[generateNotesFromPdf] Error calling generateNotesFlow:', error);
      throw error; // Re-throw
  }
}

const prompt = ai.definePrompt({
  name: 'generateNotesPrompt',
  input: {
    schema: GenerateNotesInputSchema
  },
  output: {
    schema: GenerateNotesOutputSchema,
    format: 'json', // Ensure JSON output
  },
  prompt: `You are an expert academic assistant specializing in summarizing and creating structured study notes from PDF documents.

  Analyze the provided PDF document and generate:
  1. Comprehensive yet concise study notes in **Markdown format**. Cover key topics, concepts, definitions, and important details. Structure the notes logically using headings, bullet points, etc.
  2. An array of 3-5 relevant **tags** (keywords) that accurately represent the note's content.
  3. A single, relevant primary **category** for the notes.

  {{#if instructions}}
  Follow these specific instructions for content, tags, and category: {{{instructions}}}
  {{else}}
  Generate general study notes covering the main points, suitable tags, and an appropriate category.
  {{/if}}

  PDF Content:
  {{media url=pdfDataUri}}

  Generate the notes, tags, and category now based on the PDF content and instructions. Respond ONLY with a JSON object containing 'content', 'tags', and 'category' fields. Do not include any introductory text or markdown formatting around the JSON.
  `,
  // Specify the model capable of processing PDFs (Gemini 1.5 Flash or Pro)
  model: 'googleai/gemini-1.5-flash', // Or 'googleai/gemini-1.5-pro' if flash is insufficient
});

// Internal flow definition
const generateNotesFlow = ai.defineFlow<
  typeof GenerateNotesInputSchema,
  typeof GenerateNotesOutputSchema // Flow returns the AI output structure
>({
  name: 'generateNotesFlow',
  inputSchema: GenerateNotesInputSchema,
  outputSchema: GenerateNotesOutputSchema,
}, async input => {
  console.log('[generateNotesFlow] Starting flow execution for PDF:', input.pdfDataUri.substring(0, 50) + "..."); // Log start
  const {output, usage} = await prompt(input);
  console.log('[generateNotesFlow] AI prompt call completed. Usage:', usage);

   if (!output || typeof output.content !== 'string' || !Array.isArray(output.tags) || typeof output.category !== 'string') {
      console.error('[generateNotesFlow] AI failed to return a valid response structure. Output received:', output);
      throw new Error("AI failed to generate notes, tags, or category in the expected format.");
   }

   // Basic validation for tags and category
   const validTags = output.tags.filter(tag => typeof tag === 'string' && tag.trim() !== '');
   const validCategory = output.category.trim() || 'Uncategorized'; // Default category if empty

   console.log(`[generateNotesFlow] Notes generation successful. Content length: ${output.content.length}, Tags: ${validTags.join(', ')}, Category: ${validCategory}`);
   // Return the structured data as defined by GenerateNotesOutputSchema
   return {
     content: output.content,
     tags: validTags,
     category: validCategory,
   };
});
