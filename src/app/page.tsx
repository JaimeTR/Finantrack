import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function SplashPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="absolute inset-0 -z-10 size-full bg-background [background:radial-gradient(125%_125%_at_50%_10%,hsl(var(--background))_40%,hsl(var(--primary))_100%)]"></div>

        <div className="z-10 flex flex-col items-center justify-center">
          <Logo className="mb-6 h-20 w-20 text-primary" />
          <h1 className="font-headline text-5xl font-bold tracking-tight text-primary md:text-6xl">
            FinanTrack
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Finanzas Inteligentes, Decisiones Brillantes
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="font-bold">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="font-bold">
              <Link href="/signup">Registrarse</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
