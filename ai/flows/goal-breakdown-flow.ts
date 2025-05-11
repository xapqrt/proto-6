
'use server';
/**
 * @fileOverview AI-powered goal breakdown into actionable tasks.
 *
 * - breakDownGoalIntoTasks - Function to generate tasks from a goal description.
 * - BreakDownGoalInput - Input type for the breakDownGoalIntoTasks function.
 * - BreakDownGoalOutput - Return type for the breakDownGoalIntoTasks function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

// --- Input Schema ---
const BreakDownGoalInputSchema = z.object({
  goalName: z.string().describe('The name or title of the goal.'),
  goalDescription: z.string().optional().describe('A detailed description of the goal (optional but recommended).'),
  // Could add more context later, like existing tasks, user preferences etc.
});
export type BreakDownGoalInput = z.infer<typeof BreakDownGoalInputSchema>;

// --- Output Schema ---
const BreakDownGoalOutputSchema = z.object({
  tasks: z.array(z.string()).describe('An array of suggested actionable task descriptions (strings) to achieve the goal.'),
});
export type BreakDownGoalOutput = z.infer<typeof BreakDownGoalOutputSchema>;

// --- Exported Wrapper Function ---
export async function breakDownGoalIntoTasks(input: BreakDownGoalInput): Promise<BreakDownGoalOutput> {
  console.log(`[breakDownGoalIntoTasks] Request received for goal: ${input.goalName}`);
  try {
      const result = await breakDownGoalFlow(input);
      console.log(`[breakDownGoalIntoTasks] Flow completed. Generated ${result.tasks?.length ?? 0} tasks.`);
      return result;
  } catch (error) {
      console.error('[breakDownGoalIntoTasks] Error calling flow:', error);
      throw error; // Re-throw for the calling component
  }
}

// --- AI Prompt Definition ---
const prompt = ai.definePrompt({
  name: 'breakDownGoalPrompt',
  input: {
    schema: BreakDownGoalInputSchema,
  },
  output: {
    schema: BreakDownGoalOutputSchema,
    format: 'json' // Ensure structured JSON output
  },
  prompt: `You are an expert productivity assistant specializing in breaking down goals into smaller, actionable tasks.

  Goal Name: {{{goalName}}}
  {{#if goalDescription}}
  Goal Description: {{{goalDescription}}}
  {{/if}}

  Based on the provided goal name and description, generate a list of specific, actionable tasks that need to be completed to achieve this goal.
  Each task should be a clear, concise instruction starting with an action verb (e.g., "Research...", "Draft...", "Schedule...", "Complete...").
  Generate a reasonable number of tasks (typically 3-10) that represent the key steps. Avoid being overly granular or too high-level.

  Respond ONLY with a JSON object containing a single key "tasks", which is an array of strings representing the task descriptions. Do not include any introductory text, explanations, or markdown formatting.

  Example Input:
  Goal Name: "Learn React Basics"
  Goal Description: "Understand core React concepts like components, state, props, and hooks to build simple web applications."

  Example Output:
  {
    "tasks": [
      "Complete the official React tutorial (react.dev)",
      "Build a simple counter application using useState hook",
      "Create a component that accepts and displays props",
      "Learn about conditional rendering in React",
      "Experiment with the useEffect hook for side effects",
      "Read documentation on React Router for navigation"
    ]
  }

  Now, generate the tasks for the provided goal.
  `,
  // Consider using a slightly more capable model if needed, but flash should be okay
  // model: 'googleai/gemini-1.5-flash',
});

// --- Genkit Flow Definition ---
const breakDownGoalFlow = ai.defineFlow<
  typeof BreakDownGoalInputSchema,
  typeof BreakDownGoalOutputSchema
>({
  name: 'breakDownGoalFlow',
  inputSchema: BreakDownGoalInputSchema,
  outputSchema: BreakDownGoalOutputSchema,
}, async (input) => {
  console.log('[breakDownGoalFlow] Starting flow execution...');
  try {
    const { output, usage } = await prompt(input);
    console.log('[breakDownGoalFlow] AI prompt call completed. Usage:', usage);

    if (!output || !Array.isArray(output.tasks)) {
      console.error('[breakDownGoalFlow] AI failed to return a valid response structure. Output:', output);
      throw new Error("AI failed to generate tasks. Invalid response format.");
    }

     // Filter out any empty strings just in case
     const validTasks = output.tasks.filter(task => typeof task === 'string' && task.trim() !== '');

    console.log(`[breakDownGoalFlow] Task generation successful. Found ${validTasks.length} valid tasks.`);
    return { tasks: validTasks };

  } catch (error) {
    console.error('[breakDownGoalFlow] Error during prompt execution:', error);
    throw new Error(`AI prompt failed: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Wrapper function breakDownGoalIntoTasks is exported for use in server actions.
