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
import { useToast } from '@/hooks/use-toast';
import NewExpenseForm from './new-expense-form';
import { useUser } from '@/components/providers/supabase-provider';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import type { Transaction } from '@/lib/supabase/types';

const digitalWallets = [
  { name: 'Yape', icon: Wallet },
  { name: 'Plin', icon: Wallet },
];

const banks = [
  { name: 'BCP', icon: Landmark },
  { name: 'Interbank', icon: Landmark },
  { name: 'BBVA', icon: Landmark },
];

function NewExpenseController({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      onOpenChange(true);
      router.replace('/dashboard/expenses', { scroll: false });
    }
  }, [searchParams, router, onOpenChange]);

  return null;
}

export default function ExpensesPage() {
  const { user } = useUser();
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadExpenses = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .order('date', { ascending: false });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
      } else if (data) {
        setExpenses(data as Transaction[]);
      }
      setIsLoading(false);
    };
    loadExpenses();
  }, [user, toast]);

  const sortedExpenses = useMemo(() => {
    return expenses ? [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];
  }, [expenses]);

  const reloadExpenses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .order('date', { ascending: false });
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    } else if (data) {
      setExpenses(data as Transaction[]);
    }
  };

  const handleManualSubmit = async (values: any) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from('transactions').insert({
        user_id: user.id,
        description: values.description,
        amount: values.amount,
        type: 'expense',
        category: values.category,
        date: values.date ? new Date(values.date).toISOString() : new Date().toISOString(),
      });
      if (error) throw error;

      setIsManualFormOpen(false);
      toast({ title: 'Gasto Registrado', description: `Se ha guardado un gasto de S/${values.amount}.` });
      await reloadExpenses();
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    }
  };

  const handleConnection = async (source: string) => {
    if (!user) return;
    const randomAmount = Math.floor(Math.random() * 100) + 10;

    try {
      const { error } = await (supabase as any).from('transactions').insert({
        user_id: user.id,
        description: `Gasto desde ${source}`,
        amount: randomAmount,
        type: 'expense',
        category: 'Automático',
        date: new Date().toISOString(),
      });
      if (error) throw error;

      toast({
        title: 'Gasto Registrado',
        description: `Se ha registrado un gasto de S/${randomAmount.toFixed(2)} desde ${source}.`,
      });
      await reloadExpenses();
    } catch (error: any) {
      console.error('Error adding automatic expense:', error);
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    }
  };

  return (
    <div>
      <NewExpenseController onOpenChange={setIsManualFormOpen} />
      <div className="mb-6 flex items-center justify-end gap-4">
        <Dialog open={isManualFormOpen} onOpenChange={setIsManualFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Registrar Gasto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nuevo Gasto</DialogTitle>
              <DialogDescription>
                Añade un nuevo gasto a tu historial.
              </DialogDescription>
            </DialogHeader>
            <NewExpenseForm onSubmit={handleManualSubmit} />
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
                Conecta una billetera o banco para registrar gastos
                automáticamente.
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
          <CardTitle>Historial de Gastos</CardTitle>
          <CardDescription>
            Una lista detallada de todos tus gastos.
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Cargando gastos...
                  </TableCell>
                </TableRow>
              ) : sortedExpenses.length > 0 ? (
                sortedExpenses.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.category === 'Automático' ? 'secondary' : 'outline'
                        }
                      >
                        {tx.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(tx.date), 'dd MMM, yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className={`text-right font-bold`}>
                      - S/{tx.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No has registrado ningún gasto todavía.
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
