'use server';

import { suggestBudget, type SuggestBudgetOutput } from '@/ai/flows/suggest-budget';
// Convert AI markdown recommendation to safe HTML on the server
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import type { Transaction } from './types';

export async function getBudgetSuggestion(
  transactions: Transaction[] | null,
  totalIncome: number
): Promise<{ success: boolean; data?: SuggestBudgetOutput; error?: string }> {
  try {
    if (!transactions) {
      return { success: false, error: 'No transactions available.' };
    }

    const transactionHistory = transactions
      .filter(t => t.type === 'expense')
      .map(
        t =>
          `- Categoria: ${t.category}, Monto: S/${t.amount.toFixed(2)}, Desc: ${t.description}`,
      )
      .join('\n');

    const result = await suggestBudget({ transactionHistory, totalIncome });

    // Convert recommendation markdown -> sanitized HTML (if rehype-sanitize is available)
    let recommendationHtml: string | undefined = undefined;
    if (result.recommendation) {
      try {
        let rehypeSanitizePkg: any = null;
        try {
          rehypeSanitizePkg = await import('rehype-sanitize');
        } catch (err) {
          // Module not found or cannot be imported
          console.warn('rehype-sanitize not available, skipping server-side sanitization. Install rehype-sanitize to enable it.');
        }

        if (rehypeSanitizePkg) {
          const rehypeSanitize = rehypeSanitizePkg.default || rehypeSanitizePkg;
          const defaultSchema = rehypeSanitizePkg.defaultSchema || (rehypeSanitizePkg as any).defaultSchema || {};

          const schema = {
            ...(defaultSchema || {}),
            attributes: {
              ...(((defaultSchema as any).attributes) || {}),
              a: [
                ...(((defaultSchema as any).attributes && (defaultSchema as any).attributes.a) || []),
                'target',
                'rel',
                'title',
                'aria-label',
              ],
            },
          } as any;

          const file = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype)
            .use(rehypeSanitize, schema)
            .use(rehypeStringify)
            .process(result.recommendation);
          recommendationHtml = String(file);

          // Ensure external links opened in new tabs include rel="noopener noreferrer"
          try {
            recommendationHtml = recommendationHtml.replace(/<a([^>]*?)target=(['"])_blank\2([^>]*?)>/gi, (m, p1, p2, p3) => {
              const attrs = `${p1}${p3}`;
              if (/\brel\s*=/.test(attrs)) return m; // already has rel
              return `<a${p1}target="_blank" rel="noopener noreferrer"${p3}>`;
            });
          } catch (e) {
            // noop
          }
        } else {
          // rehype-sanitize not installed: skip server-side conversion (client will fallback)
          recommendationHtml = undefined;
        }
      } catch (e) {
        console.error('Error converting recommendation to HTML:', e);
        recommendationHtml = undefined;
      }
    }

    // Return original output plus sanitized HTML version of recommendation (if available)
    return { success: true, data: { ...result, recommendationHtml } as any };
  } catch (error) {
    console.error('Error getting budget suggestion:', error);
    return { success: false, error: 'Failed to get budget suggestion.' };
  }
}
