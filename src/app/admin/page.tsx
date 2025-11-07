"use client";

import { useMemo, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase, handleSupabaseError } from '@/lib/supabase/client';
import type { User as DBUser } from '@/lib/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useAdmin } from '@/components/providers/supabase-provider';

function AccountTypeSelector({ user, onUpdated }: { user: DBUser; onUpdated?: (u: DBUser) => void }) {
  const { toast } = useToast();

  const handleTypeChange = async (newType: 'Free' | 'Premium' | 'Student') => {
    try {
      const { data, error } = await (supabase as any)
        .from('users')
        .update({ account_type: newType })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      toast({
        title: '¡Usuario Actualizado!',
        description: `La cuenta de ${user.name} ahora es ${newType}.`,
      });
      onUpdated?.(data as DBUser);
    } catch (error: any) {
      console.error('Error updating account type:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleSupabaseError(error),
      });
    }
  };

  return (
    <Select defaultValue={user.account_type} onValueChange={handleTypeChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Tipo de cuenta" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Free">Free</SelectItem>
        <SelectItem value="Premium">Premium</SelectItem>
        <SelectItem value="Student">Student</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useAdmin();
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [users, setUsers] = useState<DBUser[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar usuarios cuando sea admin o cuando se refresque
  useMemo(() => {
    let cancelled = false;
    async function loadUsers() {
      // En producción respetamos isAdmin; en desarrollo o si se fuerza via
      // NEXT_PUBLIC_FORCE_ADMIN se omite la comprobación para facilitar pruebas.
      const forceAdmin = process.env.NEXT_PUBLIC_FORCE_ADMIN === 'true' || process.env.NODE_ENV === 'development';
      if (isAdminLoading || (!isAdmin && !forceAdmin)) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      if (!cancelled) {
        if (error) {
          toast({ variant: 'destructive', title: 'Error', description: handleSupabaseError(error) });
          setUsers([]);
        } else {
          setUsers((data as DBUser[]) || []);
        }
        setIsLoading(false);
      }
    }
    loadUsers();
    return () => { cancelled = true };
  }, [isAdmin, isAdminLoading, refreshKey]);

  const filteredAndSorted = useMemo(() => {
    if (!users) return [];
    const lower = search.toLowerCase();
    return users
      .filter((u) =>
        (u.name || '').toLowerCase().includes(lower) ||
        (u.email || '').toLowerCase().includes(lower) ||
        (u.account_type || '').toLowerCase().includes(lower) ||
        (u.role || '').toLowerCase().includes(lower)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Usuarios</CardTitle>
        <CardDescription>
          Administra los usuarios registrados y sus tipos de cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <Input
            placeholder="Buscar por nombre, email, rol o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshKey((k) => k + 1);
              toast({ title: 'Actualizado', description: 'Lista de usuarios recargada.' });
            }}
          >
            <RefreshCcw className="h-4 w-4 mr-1" /> Recargar
          </Button>
          <div className="text-xs text-muted-foreground md:ml-auto">
            Total: {users ? users.length : 0} | Mostrando: {filteredAndSorted.length}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Tipo de Cuenta</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                Cargando usuarios...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && filteredAndSorted.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {search ? 'No hay coincidencias.' : 'No hay usuarios registrados.'}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            filteredAndSorted.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AccountTypeSelector user={u} onUpdated={(updated) => {
                    setUsers(prev => (prev || []).map(x => x.id === updated.id ? updated : x));
                  }} />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
 
