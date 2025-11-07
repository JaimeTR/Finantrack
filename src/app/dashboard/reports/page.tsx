'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Download, Calendar as CalendarIcon, Loader } from 'lucide-react';
import { useUser } from '@/components/providers/supabase-provider';
import type { Transaction } from '@/lib/supabase/types';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, getMonth, getYear, subMonths, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';

const chartConfig: ChartConfig = {
  income: {
    label: 'Ingresos',
    color: 'hsl(var(--chart-1))',
  },
  expense: {
    label: 'Gastos',
    color: 'hsl(var(--chart-2))',
  },
};

const weeklyChartConfig: ChartConfig = {
  expense: {
    label: 'Gastos',
    color: 'hsl(var(--chart-2))',
  },
};

export default function ReportsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const weeklyChartRef = useRef<HTMLDivElement>(null);

  const [filterType, setFilterType] = useState('last6Months');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedYear(getYear(new Date()));
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
      } else if (data) {
        setTransactions(data as Transaction[]);
      }
      setIsLoading(false);
    };
    load();
  }, [user, toast]);

  const transactionYears = useMemo(() => {
    if (!transactions) return [] as number[];
    const years = new Set(transactions.map((t) => getYear(new Date(t.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const monthlyTrendsData = useMemo(() => {
    if (!transactions) return [] as Array<{ month: string; income: number; expense: number }>;

    if (filterType === 'last6Months') {
      const monthNames = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { year: getYear(d), month: getMonth(d), label: format(d, 'MMM', { locale: es }) };
      });

      return monthNames.map(({ year, month, label }) => {
        const monthlyTransactions = transactions.filter((t) => {
          const transactionDate = new Date(t.date);
          return getYear(transactionDate) === year && getMonth(transactionDate) === month;
        });
        const income = monthlyTransactions
          .filter((t) => t.type === 'income')
          .reduce((acc, t) => acc + t.amount, 0);
        const expense = monthlyTransactions
          .filter((t) => t.type === 'expense')
          .reduce((acc, t) => acc + t.amount, 0);
        return { month: label, income, expense };
      });
    }

    if (filterType === 'byYear' && selectedYear) {
      const yearDate = new Date(selectedYear, 0, 1);
      const months = eachMonthOfInterval({ start: startOfYear(yearDate), end: endOfYear(yearDate) });
      return months.map((monthDate) => {
        const monthlyTransactions = transactions.filter((t) => {
          const transactionDate = new Date(t.date);
          return getYear(transactionDate) === selectedYear && getMonth(transactionDate) === getMonth(monthDate);
        });
        const income = monthlyTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = monthlyTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        return { month: format(monthDate, 'MMM', { locale: es }), income, expense };
      });
    }

    if (filterType === 'dateRange' && dateRange?.from && dateRange?.to) {
      const rangeTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= dateRange.from! && tDate <= dateRange.to!;
      });
      const income = rangeTransactions.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const expense = rangeTransactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      const label = `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`;
      return [{ month: label, income, expense }];
    }

    return [];
  }, [transactions, filterType, selectedYear, dateRange]);

  const weeklyTrendsData = useMemo(() => {
    if (!transactions) return [] as Array<{ day: string; expense: number }>;

    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: startOfThisWeek, end: endOfThisWeek });

    const data = weekDays.map((day) => {
      const dailyExpenses = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return t.type === 'expense' && format(tDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });

      const totalExpense = dailyExpenses.reduce((acc, t) => acc + t.amount, 0);

      return {
        day: format(day, 'EEEE', { locale: es }),
        expense: totalExpense,
      };
    });

    return data;
  }, [transactions]);

  const handleExportPDF = async () => {
    if (!monthlyChartRef.current || !weeklyChartRef.current || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron encontrar los gráficos o datos del usuario para exportar.',
      });
      return;
    }
    setIsExporting(true);

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const imgWidth = pageWidth - margin * 2;
      let currentHeight = margin;

      doc.setFontSize(20);
      doc.text('Reporte Financiero - FinanTrack', margin, currentHeight);
      currentHeight += 8;

      doc.setFontSize(12);
      doc.text(user.email || 'Usuario', margin, currentHeight);
      currentHeight += 6;

      // Process Monthly Chart
      const monthlyCanvas = await html2canvas(monthlyChartRef.current, { scale: 2 });
      const monthlyImgData = monthlyCanvas.toDataURL('image/png');
      const monthlyImgHeight = (monthlyCanvas.height * imgWidth) / monthlyCanvas.width;
      doc.addImage(monthlyImgData, 'PNG', margin, currentHeight, imgWidth, monthlyImgHeight);
      currentHeight += monthlyImgHeight + 10;

      // Process Weekly Chart
      const weeklyCanvas = await html2canvas(weeklyChartRef.current, { scale: 2 });
      const weeklyImgData = weeklyCanvas.toDataURL('image/png');
      const weeklyImgHeight = (weeklyCanvas.height * imgWidth) / weeklyCanvas.width;
      if (currentHeight + weeklyImgHeight > pageHeight) {
        doc.addPage();
        currentHeight = margin;
      }
      doc.addImage(weeklyImgData, 'PNG', margin, currentHeight, imgWidth, weeklyImgHeight);

      doc.save(`reporte-financiero-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast({ title: '¡Éxito!', description: 'Tu reporte en PDF ha sido descargado.' });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({ variant: 'destructive', title: 'Error de Exportación', description: 'No se pudo generar el PDF. Inténtalo de nuevo.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
          {isExporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Exportar a PDF
        </Button>
      </div>
      <Card ref={monthlyChartRef}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Tendencias Mensuales</CardTitle>
              <CardDescription>Ingresos vs. Gastos</CardDescription>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Seleccionar vista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last6Months">Últimos 6 meses</SelectItem>
                  <SelectItem value="byYear">Por Año</SelectItem>
                  <SelectItem value="dateRange">Rango de Fechas</SelectItem>
                </SelectContent>
              </Select>

              {filterType === 'byYear' && selectedYear && (
                <Select value={selectedYear?.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
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
                      className={cn('w-full sm:w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Elige un rango</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] w-full space-y-4 p-4">
              <Skeleton className="h-full w-full" />
            </div>
          ) : monthlyTrendsData && monthlyTrendsData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={monthlyTrendsData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center">
              <p className="text-muted-foreground">No hay datos suficientes para mostrar.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <Card ref={weeklyChartRef}>
        <CardHeader>
          <CardTitle>Tendencias Semanales de Gastos</CardTitle>
          <CardDescription>Tus gastos durante la semana actual</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] w-full space-y-4 p-4">
              <Skeleton className="h-full w-full" />
            </div>
          ) : weeklyTrendsData.some((d) => d.expense > 0) ? (
            <ChartContainer config={weeklyChartConfig} className="h-[300px] w-full">
              <LineChart data={weeklyTrendsData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickFormatter={(value) => value.substring(0, 3)} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="expense" stroke="var(--color-expense)" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] w-full items-center justify-center">
              <p className="text-muted-foreground">No se registraron gastos esta semana.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
