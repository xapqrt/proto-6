'use server';

/**
 * @fileOverview An AI assistant that answers user questions.
 *
 * - answerQuestion - A function that answers a question.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

// Define input schema (internal, not exported)
const AnswerQuestionInputSchema = z.object({
  question: z.string().describe('The question to answer.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>; // Export the type

// Define output schema (internal, not exported)
const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>; // Export the type

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  return answerQuestionFlow(input);
}

const answerQuestionPrompt = ai.definePrompt({
  name: 'answerQuestionPrompt',
  input: {
    schema: AnswerQuestionInputSchema,
  },
  output: {
    schema: AnswerQuestionOutputSchema,
  },
  prompt: `You are an AI assistant. Answer the following question: {{{question}}}`,
});

const answerQuestionFlow = ai.defineFlow<
  typeof AnswerQuestionInputSchema,
  typeof AnswerQuestionOutputSchema
>({
  name: 'answerQuestionFlow',
  inputSchema: AnswerQuestionInputSchema,
  outputSchema: AnswerQuestionOutputSchema,
}, async input => {
  const {output} = await answerQuestionPrompt(input);
  return output!;
});

