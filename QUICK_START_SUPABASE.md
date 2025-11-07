# 🚀 SCRIPT DE CONFIGURACIÓN RÁPIDA - SUPABASE

## ⚡ Quick Start (5 minutos)

### 1. Instalar Dependencias
```powershell
npm install @supabase/supabase-js
```

### 2. Configurar Variables de Entorno

Crea `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPER_ADMIN_EMAIL=jaimetr1309@gmail.com
```

### 3. Ejecutar Schema SQL

1. Abre [https://app.supabase.com](https://app.supabase.com)
2. Crea un nuevo proyecto (si no lo has hecho)
3. Ve a **SQL Editor** → **New query**
4. Copia TODO el contenido de `supabase/schema.sql`
5. Pega y ejecuta (click en **Run**)

### 4. Actualizar Layout Principal

Edita `src/app/layout.tsx`:

```tsx
import { SupabaseProvider } from '@/components/providers/supabase-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SupabaseProvider>
            {children}
            <Toaster />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 5. Actualizar Páginas de Autenticación

#### Login (`src/app/login/page.tsx`):

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signInWithGoogle, handleSupabaseError } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      toast({ title: 'Bienvenido', description: 'Has iniciado sesión correctamente' });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleSupabaseError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // La redirección se maneja automáticamente
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleSupabaseError(error),
      });
    }
  };

  return (
    // ... tu UI existente, solo cambia las funciones de onClick/onSubmit
  );
}
```

#### Signup (`src/app/signup/page.tsx`):

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUpWithEmail, handleSupabaseError } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signUpWithEmail(email, password, name);
      toast({
        title: '¡Cuenta creada!',
        description: 'Verifica tu email para activar tu cuenta',
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleSupabaseError(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... tu UI existente
  );
}
```

#### Callback de OAuth (`src/app/auth/callback/route.ts`):

```typescript
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirigir al dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```

### 6. Ejemplo de Consulta de Datos

#### Hook para Transacciones (`src/hooks/use-transactions.ts`):

```tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/components/providers/supabase-provider';
import type { Transaction } from '@/lib/supabase/types';

export function useTransactions(limit?: number) {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function fetchTransactions() {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        setTransactions(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();

    // Suscribirse a cambios en tiempo real (opcional)
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, limit]);

  return { transactions, isLoading, error };
}

// Función para crear transacción
export async function createTransaction(data: {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      ...data,
    })
    .select()
    .single();

  if (error) throw error;
  return transaction;
}

// Función para actualizar transacción
export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Función para eliminar transacción
export async function deleteTransaction(id: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

### 7. Actualizar Dashboard

Ejemplo básico de cómo usar los nuevos hooks:

```tsx
'use client';

import { useTransactions } from '@/hooks/use-transactions';
import { useUser } from '@/components/providers/supabase-provider';

export default function DashboardPage() {
  const { userProfile, isLoading: userLoading } = useUser();
  const { transactions, isLoading: transactionsLoading } = useTransactions(10);

  if (userLoading) return <div>Cargando usuario...</div>;
  if (!userProfile) return <div>No autenticado</div>;

  return (
    <div>
      <h1>Bienvenido, {userProfile.name}!</h1>
      
      {transactionsLoading ? (
        <div>Cargando transacciones...</div>
      ) : (
        <div>
          <h2>Últimas transacciones</h2>
          {transactions.map((t) => (
            <div key={t.id}>
              {t.description} - ${t.amount}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 8. Proteger Rutas

Middleware para proteger rutas (`src/middleware.ts`):

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Rutas que requieren autenticación
  const protectedPaths = ['/dashboard', '/admin'];
  const isProtectedPath = protectedPaths.some((path) => req.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Rutas solo para admins
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: user } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', session?.user.id)
      .single();

    const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    const isAdmin = user?.role === 'admin' || user?.email === superAdminEmail;

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

**Nota**: Necesitarás instalar:
```powershell
npm install @supabase/auth-helpers-nextjs
```

### 9. Iniciar Servidor

```powershell
npm run dev
```

### 10. Probar

1. Ve a `http://localhost:9002/signup`
2. Registra un nuevo usuario
3. Verifica el email (o desactiva verificación en Supabase)
4. Inicia sesión
5. ¡Listo! 🎉

---

## 🔥 Tips Importantes

### Desactivar Verificación de Email (Solo Desarrollo)

1. Ve a **Authentication** → **Settings**
2. **Email Auth** → Desactiva "Confirm email"

### Ver Logs en Tiempo Real

En Supabase Dashboard:
- **Database** → **Roles** → **postgres** → **Logs**
- **Authentication** → **Users** (para ver usuarios registrados)

### Probar RLS

En SQL Editor:

```sql
-- Ver como usuario específico
SET LOCAL role TO anon;
SET LOCAL request.jwt.claims TO '{"sub": "tu-user-id"}';

SELECT * FROM transactions;
```

### Regenerar Tipos

Cuando cambies el schema:

```powershell
npx supabase gen types typescript --project-id "tu-proyecto-id" > src/lib/supabase/types.ts
```

---

## ✅ Checklist de Migración

- [ ] Supabase proyecto creado
- [ ] Schema SQL ejecutado
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas
- [ ] Provider añadido a layout
- [ ] Páginas de auth actualizadas
- [ ] Callback route creado
- [ ] Hooks de datos implementados
- [ ] Middleware configurado
- [ ] Primer usuario registrado y funcionando

---

## 🆘 Ayuda Rápida

**Error: "Invalid API key"**
→ Verifica `.env.local` y reinicia servidor

**Error: "Row Level Security"**
→ Revisa las políticas en Table Editor

**Error: "Email not confirmed"**
→ Desactiva confirmación en Authentication settings

**Usuarios no aparecen en tabla**
→ El trigger `handle_new_user` debería crearlos automáticamente al registrarse

---

## 📚 Próximos Pasos

Una vez que esto funcione:

1. Migra las demás páginas (expenses, income, goals, etc.)
2. Implementa Storage para avatares
3. Agrega funciones Edge (si necesitas lógica backend)
4. Configura CI/CD
5. Deploy a producción

¡Suerte con la migración! 🚀
