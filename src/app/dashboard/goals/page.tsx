'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import NewGoalForm from './new-goal-form';
import { useUser } from '@/components/providers/supabase-provider';
import type { Goal as DBGoal, GoalContribution as DBContribution } from '@/lib/supabase/types';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function GoalDetailsModal({ goal }: { goal: DBGoal }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [contributions, setContributions] = useState<DBContribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('goal_contributions')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_id', goal.id)
        .order('contributed_at', { ascending: false });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
      } else if (data) {
        setContributions(data as DBContribution[]);
      }
      setIsLoading(false);
    };
    load();
  }, [user, goal.id, toast]);

  const sortedContributions = contributions || [];

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{goal.name}</DialogTitle>
        <DialogDescription>Historial de aportes para esta meta.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2 py-4">
        <Progress value={(goal.current_amount / goal.target_amount) * 100} />
        <div className="flex justify-between text-sm font-medium">
          <span>S/ {goal.current_amount.toFixed(2)}</span>
          <span className="text-muted-foreground">S/ {goal.target_amount.toFixed(2)}</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && sortedContributions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  No hay aportes todavía.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              sortedContributions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{format(new Date(c.contributed_at), 'dd/MM/yy')}</TableCell>
                  <TableCell>{c.notes || 'Aporte'}</TableCell>
                  <TableCell className="text-right font-medium text-primary">+ S/{c.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  );
}

function NewGoalController({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      onOpenChange(true);
      router.replace('/dashboard/goals', { scroll: false });
    }
  }, [searchParams, router, onOpenChange]);

  return null;
}

export default function GoalsPage() {
  const { user } = useUser();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goals, setGoals] = useState<DBGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadGoals = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
      } else if (data) {
        setGoals(data as DBGoal[]);
      }
      setIsLoading(false);
    };
    loadGoals();
  }, [user, toast]);

  const handleAddGoal = async (values: { title: string; targetAmount: number; deadline: Date }) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from('goals').insert({
        user_id: user.id,
        name: values.title,
        target_amount: values.targetAmount,
        target_date: values.deadline ? values.deadline.toISOString() : null,
        current_amount: 0,
        status: 'active',
      });
      if (error) throw error;

      toast({ title: '¡Meta Creada!', description: `Tu meta "${values.title}" ha sido creada.` });
      setIsFormOpen(false);
      // reload goals
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setGoals(data as DBGoal[]);
    } catch (error: any) {
      console.error('Error adding goal:', error);
      toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
    }
  };

  const sortedGoals = goals
    ? [...goals].sort((a, b) => {
        const da = a.target_date ? new Date(a.target_date).getTime() : 0;
        const db = b.target_date ? new Date(b.target_date).getTime() : 0;
        return da - db;
      })
    : [];

  return (
    <div>
      <NewGoalController onOpenChange={setIsFormOpen} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold">Tus Metas</h1>
          <p className="text-muted-foreground">Sigue tu progreso hacia un futuro financiero más brillante.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Meta de Ahorro</DialogTitle>
              <DialogDescription>Define qué quieres lograr y empieza a ahorrar hoy mismo.</DialogDescription>
            </DialogHeader>
            <NewGoalForm onSubmit={handleAddGoal} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-3 w-1/3" />
              </CardFooter>
            </Card>
          ))}
        {sortedGoals &&
          sortedGoals.map((goal) => {
            const progress = (goal.current_amount / goal.target_amount) * 100;
            return (
              <Dialog key={goal.id}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-1">
                    <CardHeader>
                      <CardTitle>{goal.name}</CardTitle>
                      <CardDescription>
                        Fecha límite: {goal.target_date ? format(new Date(goal.target_date), 'dd MMMM, yyyy', { locale: es }) : '—'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Progress value={progress} aria-label={`${goal.name} progress`} />
                      <div className="flex justify-between text-sm font-medium">
                        <span>S/ {goal.current_amount.toFixed(2)}</span>
                        <span className="text-muted-foreground">S/ {goal.target_amount.toFixed(2)}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <span className="text-xs text-muted-foreground">{progress.toFixed(0)}% completado</span>
                    </CardFooter>
                  </Card>
                </DialogTrigger>
                <GoalDetailsModal goal={goal} />
              </Dialog>
            );
          })}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Card className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed transition-colors hover:border-primary hover:bg-accent">
              <CardHeader className="text-center">
                <PlusCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle className="mt-4">Crear Nueva Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="ghost">Agregar Meta</Button>
              </CardContent>
            </Card>
          </DialogTrigger>
        </Dialog>
      </div>
    </div>
  );
}
