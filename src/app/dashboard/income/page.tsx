'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Landmark, PlusCircle, Wallet } from 'lucide-react';
import NewIncomeForm from './new-income-form';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/components/providers/supabase-provider';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import type { Goal, Transaction } from '@/lib/supabase/types';

const digitalWallets = [
  { name: 'Yape', icon: Wallet },
  { name: 'Plin', icon: Wallet },
];

const banks = [
  { name: 'BCP', icon: Landmark },
  { name: 'Interbank', icon: Landmark },
  { name: 'BBVA', icon: Landmark },
];

function NewIncomeController({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      onOpenChange(true);
      router.replace('/dashboard/income', { scroll: false });
    }
  }, [searchParams, router, onOpenChange]);

  return null;
}

export default function IncomePage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [isManualFormOpen, setIsManualFormOpen] = useState(false);

  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoadingIncomes, setIsLoadingIncomes] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);

  // Cargar ingresos y metas desde Supabase
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoadingIncomes(true);
      setIsLoadingGoals(true);

      const [txRes, goalsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .order('date', { ascending: false }),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (!txRes.error && txRes.data) setIncomes(txRes.data as Transaction[]);
      if (!goalsRes.error && goalsRes.data) setGoals(goalsRes.data as Goal[]);

      if (txRes.error) toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(txRes.error) });
      if (goalsRes.error) toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(goalsRes.error) });

      setIsLoadingIncomes(false);
      setIsLoadingGoals(false);
    };

    loadData();
  }, [user, toast]);

  const sortedIncomes = useMemo(() => {
    return incomes ? [...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  }, [incomes]);

  const reloadIncomes = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .order('date', { ascending: false });
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    } else if (data) {
      setIncomes(data as Transaction[]);
    }
  };

  const handleManualSubmit = async (values: any) => {
    if (!user) return;
    const { allocateToGoal, goalId, allocationType, allocationValue, ...incomeData } = values;

    try {
      // 1) Insertar ingreso
      const { data: inserted, error: txError } = await (supabase as any)
        .from('transactions')
        .insert({
          user_id: user.id,
          description: incomeData.description,
          amount: incomeData.amount,
          type: 'income',
          category: incomeData.category,
          date: incomeData.date ? new Date(incomeData.date).toISOString() : new Date().toISOString(),
        })
        .select()
        .single();

      if (txError) throw txError;

      // 2) Aportar a meta si aplica
      if (allocateToGoal && goalId && allocationValue > 0) {
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) {
          toast({ variant: 'destructive', title: 'Error', description: 'Meta no encontrada.' });
          return;
        }
        let amountToAllocate = 0;
        if (allocationType === 'percentage') {
          amountToAllocate = (values.amount * allocationValue) / 100;
        } else {
          amountToAllocate = allocationValue;
        }

        const { error: contribError } = await (supabase as any)
          .from('goal_contributions')
          .insert({
            goal_id: goal.id,
            user_id: user.id,
            amount: amountToAllocate,
            notes: `Aporte desde ingreso: ${incomeData.description}`,
            contributed_at: new Date().toISOString(),
          });
        if (contribError) throw contribError;

        // Actualizar monto actual de la meta (si no hay trigger)
        const newCurrent = (goal.current_amount || 0) + amountToAllocate;
        await (supabase as any)
          .from('goals')
          .update({ current_amount: Math.min(newCurrent, goal.target_amount) })
          .eq('id', goal.id);

        toast({
          title: '¡Ingreso y Aporte Registrados!',
          description: `S/${values.amount} registrados y S/${amountToAllocate.toFixed(2)} aportados a "${goal.name}".`,
        });
      } else {
        toast({
          title: 'Ingreso Registrado',
          description: `Se ha guardado un ingreso de S/${values.amount}.`,
        });
      }

      setIsManualFormOpen(false);
      await reloadIncomes();
    } catch (error: any) {
      console.error('Error adding income:', error);
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    }
  };

  const handleConnection = async (source: string) => {
    if (!user) return;
    const randomAmount = Math.floor(Math.random() * 500) + 50;

    try {
      const { error } = await (supabase as any).from('transactions').insert({
        user_id: user.id,
        description: `Ingreso desde ${source}`,
        amount: randomAmount,
        type: 'income',
        category: 'Automático',
        date: new Date().toISOString(),
      });
      if (error) throw error;

      toast({
        title: 'Ingreso Registrado',
        description: `Se ha registrado un ingreso de S/${randomAmount.toFixed(2)} desde ${source}.`,
      });
      await reloadIncomes();
    } catch (error: any) {
      console.error('Error adding automatic income:', error);
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    }
  };

  return (
    <div>
      <NewIncomeController onOpenChange={setIsManualFormOpen} />
      <div className="mb-6 flex items-center justify-end gap-4">
        <Dialog open={isManualFormOpen} onOpenChange={setIsManualFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Ingreso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <DialogHeader>
              <DialogTitle>Nuevo Ingreso</DialogTitle>
              <DialogDescription>
                Añade un nuevo ingreso a tu historial con su categoría.
              </DialogDescription>
            </DialogHeader>
            <NewIncomeForm onSubmit={handleManualSubmit} goals={goals as any || []} />
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Wallet className="mr-2 h-4 w-4" />
              Conectar Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Conectar Cuenta</DialogTitle>
              <DialogDescription>
                Conecta una billetera o banco para registrar ingresos automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <h3 className="mb-2 font-medium">Billeteras Digitales</h3>
                <div className="grid grid-cols-2 gap-4">
                  {digitalWallets.map((wallet) => (
                    <Button
                      key={wallet.name}
                      variant="outline"
                      className="flex h-20 flex-col items-center justify-center gap-2"
                      onClick={() => handleConnection(wallet.name)}
                    >
                      <wallet.icon className="h-6 w-6" />
                      <span>{wallet.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 font-medium">Bancos</h3>
                <div className="grid grid-cols-3 gap-4">
                  {banks.map((bank) => (
                    <Button
                      key={bank.name}
                      variant="outline"
                      className="flex h-20 flex-col items-center justify-center gap-2"
                      onClick={() => handleConnection(bank.name)}
                    >
                      <bank.icon className="h-6 w-6" />
                      <span>{bank.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Ingresos</CardTitle>
          <CardDescription>
            Una lista detallada de todos tus ingresos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingIncomes ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Cargando ingresos...
                  </TableCell>
                </TableRow>
              ) : sortedIncomes.length > 0 ? (
                sortedIncomes.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tx.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.category === 'Automático' ? 'secondary' : 'outline'}>{tx.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(tx.date), 'dd MMM, yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className={`text-right font-bold text-primary`}>
                      + S/{tx.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Aún no has registrado ningún ingreso.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
