import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Ensure the API key is being read from the environment variable
const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.warn(
    'GOOGLE_GENAI_API_KEY is not set. AI features will not work. Please set it in your .env file.'
  );
}

export const ai = genkit({
  promptDir: './prompts', // This might not be used if prompts are defined in code
  plugins: [
    googleAI({
      apiKey: apiKey, // Pass the apiKey variable here
    }),
  ],
  // Default model for general text generation, can be overridden in specific prompts/flows
  model: 'googleai/gemini-1.5-flash', // Changed to 1.5-flash as 2.0-flash is experimental for image gen
});
