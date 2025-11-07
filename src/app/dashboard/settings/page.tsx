'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Monitor, Sun, Moon, Laptop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  areNotificationsSupported, 
  getNotificationPermission,
  requestNotificationPermission,
  areNotificationsEnabled,
  setNotificationsEnabled as saveNotificationPreference,
  showNotification
} from '@/lib/notifications';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Evitar hydration mismatch
  useEffect(() => {
    setMounted(true);
    // Cargar preferencia de notificaciones desde localStorage
    setNotificationsEnabled(areNotificationsEnabled());
  }, []);

  const handleThemeChange = (selectedTheme: ThemeOption) => {
    setTheme(selectedTheme);
    toast({
      title: 'Tema actualizado',
      description: `Se ha cambiado al tema ${
        selectedTheme === 'light' ? 'claro' : 
        selectedTheme === 'dark' ? 'oscuro' : 
        'del sistema'
      }.`,
    });
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      // Verificar soporte de notificaciones
      if (!areNotificationsSupported()) {
        toast({
          variant: 'destructive',
          title: 'No soportado',
          description: 'Tu navegador no soporta notificaciones.',
        });
        return;
      }

      // Verificar o solicitar permiso
      let permission = getNotificationPermission();
      
      if (permission === 'default') {
        permission = await requestNotificationPermission();
      }

      if (permission === 'granted') {
        setNotificationsEnabled(true);
        saveNotificationPreference(true);
        
        toast({
          title: 'Notificaciones habilitadas',
          description: 'Ahora recibirás alertas sobre tus finanzas.',
        });

        // Mostrar notificación de prueba
        setTimeout(() => {
          showNotification('✅ Notificaciones activadas', {
            body: 'Recibirás alertas sobre presupuestos, metas y transacciones.',
            tag: 'test-notification',
          });
        }, 500);
      } else {
        toast({
          variant: 'destructive',
          title: 'Permiso denegado',
          description: 'Necesitas permitir notificaciones en la configuración de tu navegador.',
        });
      }
    } else {
      setNotificationsEnabled(false);
      saveNotificationPreference(false);
      
      toast({
        title: 'Notificaciones deshabilitadas',
        description: 'No recibirás más alertas.',
      });
    }
  };

  if (!mounted) {
    return null; // Evitar hydration mismatch
  }

  const themeOptions: { value: ThemeOption; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Laptop },
  ];

  return (
    <div className="grid gap-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la Aplicación</CardTitle>
          <CardDescription>
            Personaliza tu experiencia en FinanTrack.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Apariencia */}
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label className="font-medium flex items-center text-base">
                <Monitor className="mr-2 h-5 w-5" />
                Apariencia
              </Label>
              <p className="text-sm text-muted-foreground">
                Elige el tema de la aplicación.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notificaciones */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="notifications" className="font-medium flex items-center text-base">
                <Bell className="mr-2 h-5 w-5" />
                Notificaciones
              </Label>
              <p className="text-sm text-muted-foreground">
                Recibe alertas sobre tus transacciones, presupuestos y metas.
              </p>
            </div>
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
              aria-label="Habilitar notificaciones"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
