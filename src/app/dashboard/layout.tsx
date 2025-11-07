'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Settings,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
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
import { useUser } from '@/components/providers/supabase-provider';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Resumen' },
  { href: '/dashboard/income', icon: ArrowUpCircle, label: 'Ingresos' },
  { href: '/dashboard/expenses', icon: ArrowDownCircle, label: 'Gastos' },
  { href: '/dashboard/budget', icon: Wallet, label: 'Presupuesto' },
  { href: '/dashboard/goals', icon: PiggyBank, label: 'Metas' },
  { href: '/dashboard/reports', icon: BarChart, label: 'Reportes' },
];

const pageTitles: { [key: string]: string } = {
  '/dashboard': 'Resumen Financiero',
  '/dashboard/income': 'Mis Ingresos',
  '/dashboard/expenses': 'Mis Gastos',
  '/dashboard/budget': 'Presupuesto Mensual',
  '/dashboard/goals': 'Metas de Ahorro',
  '/dashboard/reports': 'Reportes y Estadísticas',
  '/dashboard/profile': 'Mi Perfil',
  '/dashboard/settings': 'Configuración',
};

function BottomNavBar() {
  const pathname = usePathname();
  const bottomNavItems = navItems.filter(item => ['/dashboard/income', '/dashboard/expenses', '/dashboard/budget', '/dashboard/goals'].includes(item.href));

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
      <nav className="flex justify-around items-center h-16">
        {bottomNavItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-20 ${
              pathname.startsWith(item.href)
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            }`}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, isLoading: isUserLoading } = useUser();
  const [imageError, setImageError] = React.useState(false);
  const avatarImage = PlaceHolderImages.find(p => p.id === 'user-avatar-1');
  
  let pageTitle = 'FinanTrack';
  const matchingPath = Object.keys(pageTitles).find(path => pathname.startsWith(path) && path !== '/dashboard');
  pageTitle = pageTitles[matchingPath || pathname] || pageTitles['/dashboard'];


  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [isUserLoading, user, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const userDisplayName = userProfile?.name || user?.email || 'Usuario';
  const userDisplayEmail = user?.email || 'cargando...';
  const userDisplayPhoto = imageError 
    ? `https://avatar.vercel.sh/${user?.id}.png`
    : (userProfile?.photo_url || `https://avatar.vercel.sh/${user?.id}.png`);
  // Mapear tipos de cuenta de Supabase a los aceptados por <Logo/>
  const userAccountType = (userProfile?.account_type === 'Premium' ? 'Premium' : 'Free') as 'Free' | 'Premium';

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <Logo/>
            <p>Cargando tu experiencia...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo accountType={userAccountType} />
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 my-1 transition-all ${
                    pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href
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
                <Logo accountType={userAccountType} />
              </SheetHeader>
              <nav className="grid gap-2 text-lg font-medium">
                {navItems.map((item) => (
                   <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 my-1 transition-all ${
                      pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href
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
            <h1 className="font-headline text-xl md:text-2xl font-semibold">{pageTitle}</h1>
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
                  <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted border-2 border-background">
                    <Image
                      src={userDisplayPhoto}
                      alt={userDisplayName}
                      fill
                      className="object-cover"
                      onError={() => setImageError(true)}
                    />
                  </div>
                ) : ( <Skeleton className="h-9 w-9 rounded-full" />)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Cuenta - {userAccountType}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/dashboard/profile">Perfil</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/dashboard/settings">Configuración</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>Cerrar Sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background md:pb-6 pb-24">
          {children}
        </main>
        <BottomNavBar />
      </div>
    </div>
  );
}
