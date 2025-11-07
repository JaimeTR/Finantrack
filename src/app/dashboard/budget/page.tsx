'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { transactionCategories } from '@/lib/placeholder-data';
import { getBudgetSuggestion } from '@/lib/actions';
import { Loader, Sparkles } from 'lucide-react';
import { useUser } from '@/components/providers/supabase-provider';
import { format, getMonth, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import type { Transaction } from '@/lib/supabase/types';

const getCurrentMonthId = () => format(new Date(), 'yyyy-MM');

type BudgetCategory = { category: string; amount: number };

export default function BudgetPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const [totalBudget, setTotalBudget] = useState(0);
  const [categoryBudgets, setCategoryBudgets] = useState<BudgetCategory[]>(
    transactionCategories.map((c) => ({ category: c, amount: 0 }))
  );

  const [budgetId, setBudgetId] = useState<string | null>(null);

  useEffect(() => {
    setBudgetId(getCurrentMonthId());
  }, []);

  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
  const [manualBudget, setManualBudget] = useState<number | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Cargar transacciones y presupuesto guardado del mes
      const [txRes, budgetRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        budgetId
          ? supabase
              .from('budgets')
              .select('*')
              .eq('user_id', user.id)
              .eq('period', budgetId)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      if (txRes.error) {
        toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(txRes.error) });
      } else if (txRes.data) {
        setTransactions(txRes.data as Transaction[]);
      }

      if (!budgetRes.error && budgetRes.data && Array.isArray(budgetRes.data)) {
        const rows = budgetRes.data as Array<{ category: string; amount: number }>;
        const savedMap = new Map(rows.map((r) => [r.category, r.amount]));
        setCategoryBudgets(
          transactionCategories.map((c) => ({ category: c, amount: savedMap.get(c) || 0 }))
        );
        setTotalBudget(rows.reduce((acc, r) => acc + (r.amount || 0), 0));
      } else if (budgetRes.error) {
        toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(budgetRes.error) });
      }
    };
    load();
  }, [user, budgetId, toast]);

  const handleCategoryChange = (category: string, amount: string) => {
    const newAmount = parseFloat(amount) || 0;
    setCategoryBudgets((prev) =>
      prev.map((cat) => (cat.category === category ? { ...cat, amount: newAmount } : cat))
    );
  };

  useEffect(() => {
    const calculatedTotal = categoryBudgets.reduce((acc, cat) => acc + cat.amount, 0);
    setTotalBudget(calculatedTotal);
  }, [categoryBudgets]);

  const { totalIncome, expensesByCategory, totalExpenses } = useMemo(() => {
    if (!transactions) return { totalIncome: 0, expensesByCategory: {}, totalExpenses: 0 } as any;

    const currentMonth = getMonth(new Date());
    const currentYear = getYear(new Date());

    const monthlyTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return getMonth(transactionDate) === currentMonth && getYear(transactionDate) === currentYear;
    });

    const totalIncome = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const expensesByCategory = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
        return acc;
      }, {} as { [key: string]: number });

    return { totalIncome, expensesByCategory, totalExpenses };
  }, [transactions]);

  const currentBalance = totalIncome - totalExpenses;

  const handleSuggestion = async (income: number) => {
    setIsLoadingSuggestion(true);
    setRecommendation(null);
    setIsSuggestionModalOpen(false);

    const result = await getBudgetSuggestion(transactions as any, income);
    if (result.success && result.data) {
      const { budgetPlan, recommendation, recommendationHtml } = result.data as any;
      const newCategoryBudgets = transactionCategories.map((c) => {
        const suggestion = budgetPlan.find((p) => p.category === c);
        return { category: c, amount: suggestion ? suggestion.amount : 0 };
      });
      setCategoryBudgets(newCategoryBudgets);
      // Actualizar el total inmediatamente para que se muestre sin depender solo del useEffect
      const newTotal = newCategoryBudgets.reduce((acc, cat) => acc + (cat.amount || 0), 0);
      setTotalBudget(newTotal);
      // Prefer sanitized HTML (from server) if available, otherwise use raw markdown
      setRecommendation(recommendationHtml ?? recommendation ?? null);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error de IA',
        description: result.error || 'No se pudo obtener la sugerencia.',
      });
    }
    setIsLoadingSuggestion(false);
  };

  const handleSaveBudget = async () => {
    if (!user || !budgetId) return;
    setIsSaving(true);
    try {
      // Limpiar presupuesto previo del periodo y reinsertar categorías activas
      const { error: delError } = await supabase
        .from('budgets')
        .delete()
        .eq('user_id', user.id)
        .eq('period', budgetId);
      if (delError) throw delError;

      // Do not set `id` manually: budgets.id is a UUID in the DB and
      // should be generated server-side (uuid_generate_v4()).
      // Setting a custom string (like `${user.id}-${budgetId}-${c.category}`)
      // causes "invalid input syntax for type uuid" errors.
      const rows = categoryBudgets
        .filter((c) => c.amount > 0)
        .map((c) => ({
          user_id: user.id,
          category: c.category,
          amount: c.amount,
          period: budgetId,
        }));

      if (rows.length > 0) {
        const { error: insError } = await (supabase as any).from('budgets').insert(rows);
        if (insError) throw insError;
      }

      toast({ title: '¡Presupuesto Guardado!', description: 'Tu presupuesto mensual ha sido actualizado.' });
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: es });

  // Minimal, safe-ish markdown -> HTML converter supporting headings (###, ####),
  // paragraphs and bullet lists (- or *). It first escapes HTML to avoid raw HTML injection
  // and then converts limited markdown tokens.
  function formatRecommendation(md: string) {
    if (!md) return '';
    // Escape HTML
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = md.split(/\r?\n/);
    let html = '';
    let inList = false;
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
      if (paragraphBuffer.length === 0) return;
      const text = paragraphBuffer.join(' ');
      html += `<p>${processInline(esc(text))}</p>`;
      paragraphBuffer = [];
    };

    const flushList = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    };

    function processInline(s: string) {
      // Bold **text** -> <strong>
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic *text* -> <em>
      s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Links [text](url) -> <a ...>
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
        const safeUrl = esc(url);
        const safeText = text; // already escaped earlier via esc when building text
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      });
      // Inline code `code`
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      return s;
    }

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();

      // Blank line => paragraph boundary
      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }

      // Headings
      const h3 = line.match(/^###\s+(.+)$/);
      const h4 = line.match(/^####\s+(.+)$/);
      const h2 = line.match(/^##\s+(.+)$/);
      const h1 = line.match(/^#\s+(.+)$/);
      if (h1 || h2 || h3 || h4) {
        flushParagraph();
        flushList();
        const content = esc((h1 || h2 || h3 || h4)![1]);
        if (h1) html += `<h1>${processInline(content)}</h1>`;
        else if (h2) html += `<h2>${processInline(content)}</h2>`;
        else if (h3) html += `<h3>${processInline(content)}</h3>`;
        else html += `<h4>${processInline(content)}</h4>`;
        continue;
      }

      // Bullet list
      const listMatch = line.match(/^[-*]\s+(.+)$/);
      if (listMatch) {
        flushParagraph();
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        const content = esc(listMatch[1]);
        html += `<li>${processInline(content)}</li>`;
        continue;
      }

      // Otherwise part of a paragraph (allow wrapping across lines)
      paragraphBuffer.push(line);
    }

    flushParagraph();
    flushList();
    return html;
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Presupuesto de {currentMonthName}</CardTitle>
            <CardDescription>Configura y monitorea tu presupuesto mensual.</CardDescription>
          </div>
          <Dialog open={isSuggestionModalOpen} onOpenChange={setIsSuggestionModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsSuggestionModalOpen(true)} disabled={isLoadingSuggestion}>
                {isLoadingSuggestion ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Sugerir con IA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sugerencia de Presupuesto con IA</DialogTitle>
                <DialogDescription>Elige cómo quieres que la IA genere tu presupuesto.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Button onClick={() => handleSuggestion(totalIncome)} className="w-full">
                  Sugerir con Ingreso Actual (S/{totalIncome.toFixed(2)})
                </Button>
                <Button onClick={() => handleSuggestion(currentBalance)} className="w-full" variant="secondary">
                  Sugerir con Saldo Actual (S/{currentBalance.toFixed(2)})
                </Button>
                <div className="space-y-2">
                  <Label htmlFor="manual-budget">Sugerir con Monto Manual</Label>
                  <div className="flex gap-2">
                    <Input
                      id="manual-budget"
                      type="number"
                      placeholder="Ej: 1000"
                      onChange={(e) => setManualBudget(parseFloat(e.target.value))}
                    />
                    <Button onClick={() => manualBudget && handleSuggestion(manualBudget)} disabled={!manualBudget || manualBudget <= 0}>
                      Sugerir
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline gap-4">
            <h3 className="text-lg font-medium">Presupuesto Total Mensual:</h3>
            <span className="text-2xl font-bold text-primary">S/ {totalBudget.toFixed(2)}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {categoryBudgets.map((cat) => {
              const spent = (expensesByCategory as any)[cat.category] || 0;
              const progress = cat.amount > 0 ? Math.min((spent / cat.amount) * 100, 100) : 0;
              return (
                <div key={cat.category}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <Label htmlFor={`budget-${cat.category}`} className="font-medium">
                      {cat.category}
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      S/{spent.toFixed(2)} de S/{cat.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      id={`budget-${cat.category}`}
                      type="number"
                      value={cat.amount === 0 ? '' : cat.amount}
                      onChange={(e) => handleCategoryChange(cat.category, e.target.value)}
                      className="w-32"
                      placeholder="0.00"
                    />
                    <div className="relative w-full">
                      <Progress value={progress} className="h-6" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary-foreground">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {recommendation && (
            <Card className="bg-accent/50">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="mr-2 h-5 w-5 text-primary" />
                  Análisis y Recomendaciones de IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html:
                      recommendation && recommendation.trim().startsWith('<')
                        ? recommendation
                        : formatRecommendation(recommendation || ''),
                  }}
                />
              </CardContent>
            </Card>
          )}
          <Button onClick={handleSaveBudget} disabled={isSaving} className="w-full md:w-auto font-bold">
            {isSaving ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            Guardar Presupuesto
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
