'use client';
import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Landmark,
  PiggyBank,
  CircleDollarSign,
  Scale,
  Calendar as CalendarIcon,
  PlusCircle,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import {
  format,
  subMonths,
  getMonth,
  getYear,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isSameMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/components/providers/supabase-provider';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import type { Goal, Transaction } from '@/lib/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { transactionCategories } from '@/lib/placeholder-data';
import { Calendar } from '@/components/ui/calendar';
import dynamic from 'next/dynamic';

const DynamicExpensesPie = dynamic(() => import('../../components/charts/expenses-pie').then(m => m.ExpensesPie), { ssr: false, loading: () => (
  <div className="flex justify-center items-center h-[300px]"><Skeleton className="h-[250px] w-[250px] rounded-full" /></div>
) });


const chartConfig: ChartConfig = transactionCategories.reduce(
  (acc, category, index) => {
    acc[category] = {
      label: category,
      color: `hsl(var(--chart-${index + 1}))`,
    };
    return acc;
  },
  {} as ChartConfig
);


export default function DashboardPage() {
  const { user } = useUser();

  const [filterType, setFilterType] = useState('currentMonth');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  useEffect(() => {
    const now = new Date();
    setSelectedYear(getYear(now));
    setSelectedMonth(getMonth(now));
  }, []);

  // Cargar datos desde Supabase
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      if (!user) return;
      setIsLoadingTransactions(true);
      setIsLoadingGoals(true);
      setLoadError(null);
      const [txRes, goalsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(500),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
      ]);
      if (!cancelled) {
        if (txRes.error) {
          setLoadError(handleSupabaseError(txRes.error));
          setTransactions([]);
        } else {
          setTransactions((txRes.data as Transaction[]) || []);
        }
        setIsLoadingTransactions(false);

        if (goalsRes.error) {
          setLoadError(prev => prev || handleSupabaseError(goalsRes.error));
          setGoals([]);
        } else {
          setGoals((goalsRes.data as Goal[]) || []);
        }
        setIsLoadingGoals(false);
      }
    }
    loadData();
    return () => { cancelled = true };
  }, [user]);
  
  const transactionYears = useMemo(() => {
    if (!transactions) return [];
    const years = new Set(transactions.map(t => getYear(new Date(t.date))));
    return Array.from(years).sort((a,b) => b - a);
  }, [transactions]);
  
  const { uniqueMonths } = useMemo(() => {
    const months = eachMonthOfInterval({ start: new Date(2020, 0, 1), end: new Date() })
      .map(d => ({ label: format(d, 'MMMM', { locale: es }), value: getMonth(d) })).reverse();
    const uniqueMonths = months.filter((month, index, self) => index === self.findIndex(m => m.value === month.value));
    return { uniqueMonths };
  }, []);

  const { totalIncome, totalExpenses, expensesByCategory, recentTransactions, totalSavedInGoals } = useMemo(() => {
    if (!transactions || selectedMonth === null || selectedYear === null) {
      return { totalIncome: 0, totalExpenses: 0, expensesByCategory: [], recentTransactions: [], totalSavedInGoals: 0 };
    }

    const currentMonthDate = new Date();
    const currentMonth = getMonth(currentMonthDate);
    const currentYear = getYear(currentMonthDate);

    const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return getMonth(transactionDate) === currentMonth && getYear(transactionDate) === currentYear;
    });

    const totalIncome = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpensesForMonth = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    // Filter transactions for chart based on selected filters
    let filteredTransactions = transactions;
    if (filterType === 'currentMonth') {
        filteredTransactions = transactions.filter(t => isSameMonth(new Date(t.date), new Date()));
    } else if (filterType === 'last6Months') {
      const sixMonthsAgo = subMonths(new Date(), 6);
      filteredTransactions = transactions.filter(t => new Date(t.date) >= sixMonthsAgo);
    } else if (filterType === 'byMonth') {
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return getYear(tDate) === selectedYear && getMonth(tDate) === selectedMonth;
      });
    } else if (filterType === 'byYear') {
      filteredTransactions = transactions.filter(t => getYear(new Date(t.date)) === selectedYear);
    } else if (filterType === 'dateRange' && dateRange?.from && dateRange?.to) {
       filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= dateRange.from! && tDate <= dateRange.to!;
        });
    }

    const expensesByCategoryMap = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
        return acc;
      }, {} as { [key: string]: number });
    
    const expensesByCategory = Object.entries(expensesByCategoryMap).map(([name, value], index) => ({
      name,
      value,
      fill: chartConfig[name]?.color || `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    const recentTransactions = [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
      
    const totalSavedInGoals = goals ? goals.reduce((acc, goal) => acc + (goal.current_amount || 0), 0) : 0;

    return { totalIncome, totalExpenses: totalExpensesForMonth, expensesByCategory, recentTransactions, totalSavedInGoals };
  }, [transactions, goals, filterType, selectedYear, selectedMonth, dateRange]);
  
  const currentBalance = totalIncome - totalExpenses;
  
  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold text-primary">S/ {totalIncome.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">del mes actual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingTransactions ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold text-destructive">S/ {totalExpenses.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">del mes actual</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingTransactions ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">S/ {currentBalance.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">Ingresos - Gastos (mes actual)</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ahorrado en Metas</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoadingGoals ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">S/ {totalSavedInGoals.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">Suma de todas tus metas</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
           <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Gastos por Categoría</CardTitle>
                  <CardDescription>
                    Distribución de tus gastos.
                  </CardDescription>
                </div>
                <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Seleccionar vista" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="currentMonth">Mes Actual</SelectItem>
                            <SelectItem value="last6Months">Últimos 6 meses</SelectItem>
                            <SelectItem value="byMonth">Por Mes</SelectItem>
                            <SelectItem value="byYear">Por Año</SelectItem>
                            <SelectItem value="dateRange">Rango de Fechas</SelectItem>
                        </SelectContent>
                    </Select>
                     {filterType === 'byMonth' && selectedYear !== null && selectedMonth !== null && (
                        <div className="flex gap-2">
                           <Select
                                value={selectedMonth.toString()}
                                onValueChange={(val) => setSelectedMonth(parseInt(val))}
                            >
                                <SelectTrigger className="w-full sm:w-[130px]">
                                    <SelectValue placeholder="Mes" />
                                </SelectTrigger>
                                <SelectContent>
                                    {uniqueMonths.map(month => (
                                        <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <Select
                                value={selectedYear.toString()}
                                onValueChange={(val) => setSelectedYear(parseInt(val))}
                            >
                                <SelectTrigger className="w-full sm:w-[120px]">
                                    <SelectValue placeholder="Año" />
                                </SelectTrigger>
                                <SelectContent>
                                    {transactionYears.map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {filterType === 'byYear' && selectedYear !== null && (
                        <Select
                            value={selectedYear.toString()}
                            onValueChange={(val) => setSelectedYear(parseInt(val))}
                        >
                            <SelectTrigger className="w-full sm:w-[120px]">
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                {transactionYears.map(year => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {filterType === 'dateRange' && (
                       <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-[250px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                                ) : (
                                <span>Elige un rango</span>
                                )}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </div>
          </CardHeader>
          <CardContent className="pb-0">
            {isLoadingTransactions ? (
              <div className="flex justify-center items-center h-[300px]"><Skeleton className="h-[250px] w-[250px] rounded-full" /></div>
            ) : expensesByCategory.length > 0 ? (
              <DynamicExpensesPie expensesByCategory={expensesByCategory} chartConfig={chartConfig} />
            ) : (
              <div className="flex justify-center items-center h-[300px]"><p className="text-muted-foreground">No hay datos de gastos para mostrar en este período.</p></div>
            )}
          </CardContent>
          <CardContent className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
            {Object.keys(chartConfig).map(
              (key) =>
                expensesByCategory.some(e => e.name === key) && (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: (chartConfig as any)[key]?.color,
                      }}
                    />
                    <span>{chartConfig[key].label}</span>
                  </div>
                )
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle>Metas de Ahorro</CardTitle>
            <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/goals?new=true">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir meta
                </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-6">
            {isLoadingGoals ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div className="grid gap-2" key={i}>
                  <Skeleton className="h-5 w-3/5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : goals && goals.length > 0 ? (
                goals.slice(0, 2).map((goal) => (
                    <div className="grid gap-2" key={goal.id}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-sm text-muted-foreground">
                          S/{goal.current_amount.toFixed(2)} / S/
                          {goal.target_amount.toFixed(2)}
                        </span>
                      </div>
                      <Progress
                        value={
                          (goal.current_amount / goal.target_amount) * 100
                        }
                        aria-label={`${goal.name} progress`}
                      />
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground">Aún no tienes metas de ahorro.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {isLoadingTransactions ? (
                  Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : recentTransactions.length > 0 ? (
                  recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="font-medium">{tx.category}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                          {tx.description}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            tx.type === 'income' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${tx.type === 'income' ? 'text-primary' : 'text-destructive'}`}
                      >
                        {tx.type === 'income' ? '+' : '-'}S/
                        {tx.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                     <TableCell colSpan={3} className="h-24 text-center">
                        No hay movimientos recientes.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
