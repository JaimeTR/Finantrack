'use server';

/**
 * @fileOverview An AI agent that suggests a personalized monthly budget based on past spending habits and income.
 *
 * - suggestBudget - A function that handles the budget suggestion process.
 * - SuggestBudgetInput - The input type for the suggestBudget function.
 * - SuggestBudgetOutput - The return type for the suggestBudget function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { transactionCategories } from '@/lib/placeholder-data';

const SuggestBudgetInputSchema = z.object({
  totalIncome: z
    .number()
    .describe('The total monthly income or a manual budget amount for the user.'),
  transactionHistory: z
    .string()
    .describe('A list of expenses with category and amount.'),
});
export type SuggestBudgetInput = z.infer<typeof SuggestBudgetInputSchema>;

const SuggestBudgetOutputSchema = z.object({
  budgetPlan: z.array(z.object({
    category: z.string().describe('The category name.'),
    amount: z.number().describe('The suggested budget amount for the category.'),
  })).describe('An array of budget allocations for each category.'),
  recommendation: z
    .string()
    .describe(
      'A detailed analysis and personalized recommendations. Explain why the budget is structured this way, suggest areas for improvement, and advise on where to cut spending. Use markdown for formatting, including titles, paragraphs, and bullet points.',
    ),
});
export type SuggestBudgetOutput = z.infer<typeof SuggestBudgetOutputSchema>;

export async function suggestBudget(
  input: SuggestBudgetInput,
): Promise<SuggestBudgetOutput> {
  return suggestBudgetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBudgetPrompt',
  input: { schema: SuggestBudgetInputSchema },
  output: { schema: SuggestBudgetOutputSchema },
  prompt: `You are a friendly and encouraging personal finance advisor for university students. Your goal is to create a realistic and helpful monthly budget.

You will receive the user's total monthly budget (which could be their income or a manually set amount) and their recent expense history.

Based on this data, your task is to:
1.  Create a suggested budget allocation for each of the following standard categories: ${transactionCategories.join(', ')}.
2.  Ensure the total of your suggested budget does not exceed the user's total monthly budget. Prioritize savings in the 'Metas' category if possible.
3.  If a category has no spending, you can allocate a small amount or zero.
4.  Write a 'recommendation' text using Markdown. This should include:
  Write a 'recommendation' text using Markdown. Use friendly emojis where appropriate (e.g. ✅, 💡, 🧾, 🔥, 🎯) and make the text visually pleasant. This should include:
    - A section explaining your allocations (e.g., '#### ¿Cómo distribuí tu presupuesto?').
    - A section with concrete suggestions for improvement using bullet points (e.g., '#### Sugerencias para mejorar').
    - A concluding, motivational sentence.

  Use headings (###, ####), paragraphs and bullet lists. Keep sentences short, include emojis in titles and bullets, and avoid raw HTML. The output must be valid Markdown.
The output MUST be a valid JSON object matching the output schema.

Total Monthly Budget: S/{{{totalIncome}}}
Transaction History:
{{{transactionHistory}}}`,
});

const suggestBudgetFlow = ai.defineFlow(
  {
    name: 'suggestBudgetFlow',
    inputSchema: SuggestBudgetInputSchema,
    outputSchema: SuggestBudgetOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  },
);
