'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Users,
  LogOut,
  Menu,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

import { Logo } from '@/components/logo';
import { useUser, useAdmin } from '@/components/providers/supabase-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';

const navItems = [
  { href: '/admin', icon: Users, label: 'Gestión de Usuarios' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const { isAdmin, isAdminLoading } = useAdmin();
  const avatarImage = PlaceHolderImages.find(p => p.id === 'user-avatar-1');

  React.useEffect(() => {
    if (isUserLoading || isAdminLoading) {
      return; 
    }
    if (!user || !isAdmin) {
      router.replace('/login');
    }
  }, [isUserLoading, isAdminLoading, user, isAdmin, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Bloquear render completo hasta tener confirmación de permisos
  if (isUserLoading || isAdminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Logo/>
            <p>Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no es admin, mostrar mensaje y no renderizar children
  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Logo/>
            <p className="text-destructive">Acceso no autorizado</p>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Volver al Dashboard
            </Button>
        </div>
      </div>
    );
  }

  const userDisplayName = user?.email || 'Admin';
  const userDisplayEmail = user?.email || 'cargando...';
  const userDisplayPhoto = avatarImage?.imageUrl;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/admin" className="flex items-center gap-2">
               <Shield className="h-8 w-8 text-primary" />
               <span className="font-headline text-2xl font-bold">Admin</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 my-1 transition-all ${
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <SheetHeader>
                 <Link href="/admin" className="flex items-center gap-2">
                    <Shield className="h-8 w-8 text-primary" />
                    <span className="font-headline text-2xl font-bold">Admin</span>
                 </Link>
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                {navItems.map((item) => (
                   <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 my-1 transition-all ${
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h1 className="font-headline text-xl md:text-2xl font-semibold">Panel de Administración</h1>
          </div>
          <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="relative h-auto flex items-center gap-3">
                 <div className="hidden md:flex flex-col items-end text-right">
                  <p className="text-sm font-medium leading-none">
                    {userDisplayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userDisplayEmail}
                  </p>
                </div>
                 {userDisplayPhoto ? (
                  <Image
                    src={userDisplayPhoto}
                    alt={userDisplayName}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                ) : ( <Skeleton className="h-9 w-9 rounded-full" />)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Cuenta - Administrador</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/dashboard">Ir al Dashboard</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Cerrar Sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
