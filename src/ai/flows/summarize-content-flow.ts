'use server';
/**
 * @fileOverview AI-powered content summarization.
 *
 * - summarizeContent - Function to generate a summary from text content.
 * - SummarizeContentInput - Input type for the summarizeContent function.
 * - SummarizeContentOutput - Return type for the summarizeContent function (aligns with NoteData structure).
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import type { NoteData } from '@/types'; // Import NoteData for output alignment

// --- Input Schema ---
const SummarizeContentInputSchema = z.object({
  textContent: z.string().min(50).describe('The text content to be summarized (at least 50 characters).'),
  sourceUrl: z.string().url().optional().describe('Optional source URL of the content for context.'),
  instructions: z.string().optional().describe('Optional custom instructions for the summarization process (e.g., desired length, key focus areas, target audience).'),
});
export type SummarizeContentInput = z.infer<typeof SummarizeContentInputSchema>;

// --- Output Schema (Matches NoteData structure for consistency) ---
const SummarizeContentOutputSchema = z.object({
  content: z.string().describe('The generated summary in markdown format.'),
  tags: z.array(z.string()).describe('Suggested relevant tags for the summary (e.g., ["AI", "Summarization", "Article"]). Generate 3-5 relevant tags.'),
  category: z.string().describe('A suggested single primary category for the summary (e.g., "Article Summary", "Research Notes").'),
  // generatedAt will be added by the calling function
});
// Output type aligns with the main part of NoteData
export type SummarizeContentOutput = z.infer<typeof SummarizeContentOutputSchema>;

// --- Exported Wrapper Function (returns full NoteData) ---
export async function summarizeContent(input: SummarizeContentInput): Promise<NoteData> {
  console.log('[summarizeContent] Request received.');
  // Basic validation
  if (!input.textContent || input.textContent.length < 50) {
    throw new Error('Text content must be at least 50 characters long.');
  }

  try {
    const result = await summarizeContentFlow(input);
    console.log('[summarizeContent] Flow completed successfully.');
    // Add timestamp and return the full NoteData object
    const fullNoteData: NoteData = {
      ...result,
      generatedAt: Date.now(),
    };
    return fullNoteData;
  } catch (error) {
    console.error('[summarizeContent] Error calling flow:', error);
    throw error; // Re-throw for the calling component
  }
}

// --- AI Prompt Definition ---
const prompt = ai.definePrompt({
  name: 'summarizeContentPrompt',
  input: {
    schema: SummarizeContentInputSchema,
  },
  output: {
    schema: SummarizeContentOutputSchema,
    format: 'json', // Ensure structured JSON output
  },
  prompt: `You are an expert summarization AI. Analyze the provided text content and generate:
1. A concise and accurate summary in **Markdown format**. Capture the main points and key information.
2. An array of 3-5 relevant **tags** (keywords) for the summary.
3. A single, relevant primary **category** for the summary (e.g., "Article Summary", "Meeting Notes", "Research Paper").

{{#if sourceUrl}}
Source URL (for context): {{{sourceUrl}}}
{{/if}}

{{#if instructions}}
Follow these specific instructions for the summary, tags, and category: {{{instructions}}}
{{else}}
Generate a general summary covering the main points, appropriate tags, and a suitable category. Adjust summary length based on the input text length - be concise but comprehensive.
{{/if}}

Text Content to Summarize:
{{{textContent}}}

Generate the summary, tags, and category now. Respond ONLY with a JSON object containing 'content', 'tags', and 'category' fields. Do not include any introductory text or markdown formatting around the JSON.
  `,
  // Use a model capable of potentially longer context if needed
  // model: 'googleai/gemini-1.5-flash',
});

// --- Genkit Flow Definition ---
const summarizeContentFlow = ai.defineFlow<
  typeof SummarizeContentInputSchema,
  typeof SummarizeContentOutputSchema // Flow returns the AI output structure
>({
  name: 'summarizeContentFlow',
  inputSchema: SummarizeContentInputSchema,
  outputSchema: SummarizeContentOutputSchema,
}, async (input) => {
  console.log('[summarizeContentFlow] Starting flow execution...');
  try {
    const { output, usage } = await prompt(input);
    console.log('[summarizeContentFlow] AI prompt call completed. Usage:', usage);

    if (!output || typeof output.content !== 'string' || !Array.isArray(output.tags) || typeof output.category !== 'string') {
      console.error('[summarizeContentFlow] AI failed to return a valid response structure. Output:', output);
      throw new Error("AI failed to generate summary, tags, or category in the expected format.");
    }

    // Basic validation for tags and category
    const validTags = output.tags.filter(tag => typeof tag === 'string' && tag.trim() !== '');
    const validCategory = output.category.trim() || 'Summary'; // Default category if empty

    console.log(`[summarizeContentFlow] Summary generation successful. Content length: ${output.content.length}, Tags: ${validTags.join(', ')}, Category: ${validCategory}`);
    // Return the structured data as defined by SummarizeContentOutputSchema
    return {
      content: output.content,
      tags: validTags,
      category: validCategory,
    };

  } catch (error) {
    console.error('[summarizeContentFlow] Error during prompt execution:', error);
    throw new Error(`AI prompt failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});
