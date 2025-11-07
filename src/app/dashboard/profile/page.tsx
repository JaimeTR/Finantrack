'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Upload } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser, supabase, updatePassword, updateProfile, uploadAvatar, handleSupabaseError, getSignedAvatarUrl } from '@/lib/supabase/client';
import type { User as DBUser } from '@/lib/supabase/types';

const profileFormSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto.').max(50, 'El nombre es muy largo.'),
  photoURL: z
    .union([z.string().url('Por favor ingresa una URL válida.'), z.literal('')])
    .optional()
    .default(''),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres.'),
});

export default function ProfilePage() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null);
  const [dbUser, setDbUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    photo_url: string | null;
    photo_path?: string | null;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [activeAvatarTab, setActiveAvatarTab] = useState<'upload' | 'url'>('upload');

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: '', photoURL: '' },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const u = await getCurrentUser();
        if (!mounted) return;
        setAuthUser(u);
        if (!u) return;

        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, photo_url, photo_path')
          .eq('id', u.id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Perfil no encontrado');
        const row = data as DBUser;
        // Preparar URL de avatar (privado con signed URL o usar photo_url)
        if (row.photo_path) {
          try {
            const signed = await getSignedAvatarUrl(row.photo_path, 3600);
            setAvatarPreviewUrl(signed);
          } catch {}
        } else if (row.photo_url) {
          setAvatarPreviewUrl(row.photo_url);
        } else {
          setAvatarPreviewUrl(`https://avatar.vercel.sh/${u.id}.png`);
        }
        setDbUser(row);
        profileForm.reset({
          name: row.name || '',
          photoURL: row.photo_url || '',
        });
      } catch (err) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Error cargando perfil',
          description: handleSupabaseError(err),
        });
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profileForm, toast]);

  async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
    if (!authUser) return;

    try {
      // Determinar qué guardar: URL externa o archivo subido (ruta privada)
      const finalPhotoUrl = values.photoURL?.trim() || undefined;
      let newPhotoPath: string | undefined;
      if (selectedFile) {
        newPhotoPath = await uploadAvatar(selectedFile); // guarda en Storage y actualiza photo_path
      }

      await updateProfile({
        name: values.name,
        photo_url: finalPhotoUrl,
        photo_path: newPhotoPath,
      });

      // Refrescar datos
      const { data } = await supabase
        .from('users')
        .select('id, email, name, photo_url, photo_path')
        .eq('id', authUser.id)
        .single();
      if (data) {
        const row = data as DBUser;
        setDbUser(row);
        profileForm.reset({ name: row.name || '', photoURL: row.photo_url || '' });
        // Actualizar preview
        if (row.photo_path) {
          try {
            const signed = await getSignedAvatarUrl(row.photo_path, 3600);
            setAvatarPreviewUrl(signed);
          } catch {}
        } else if (row.photo_url) {
          setAvatarPreviewUrl(row.photo_url);
        } else {
          setAvatarPreviewUrl(`https://avatar.vercel.sh/${authUser.id}.png`);
        }
      }
      setSelectedFile(null);

      toast({
        title: '¡Perfil Actualizado!',
        description: 'Tus cambios han sido guardados y se reflejarán en toda la aplicación.',
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleSupabaseError(error),
      });
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
    try {
      await updatePassword(values.newPassword);
      toast({
        title: '¡Contraseña Cambiada!',
        description: 'Tu contraseña ha sido actualizada exitosamente.',
      });
      passwordForm.reset();
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: handleSupabaseError(error),
      });
    }
  }

  if (isLoading || !authUser || !dbUser) {
    return (
      <div className="grid gap-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile" className="max-w-2xl mx-auto w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Perfil</TabsTrigger>
        <TabsTrigger value="security">Seguridad</TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Perfil Público</CardTitle>
            <CardDescription>
              Esta información será visible para otros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden bg-muted border-4 border-background shadow-lg">
                    <Image
                      src={imageError ? `https://avatar.vercel.sh/${authUser.id}.png` : (avatarPreviewUrl || `https://avatar.vercel.sh/${authUser.id}.png`)}
                      alt={dbUser.name || 'Avatar'}
                      fill
                      className="object-cover"
                      onError={() => setImageError(true)}
                    />
                  </div>
                  <div className="grid gap-1 flex-1">
                    <p className="font-semibold text-lg">{dbUser.name || 'Usuario Anónimo'}</p>
                    <p className="text-sm text-muted-foreground">{dbUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsEditing((v) => !v)}>
                    {isEditing ? 'Cancelar' : 'Editar perfil'}
                  </Button>
                </div>

                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Tu nombre" {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditing && (
                  <div className="grid gap-4">
                    <div>
                      <FormLabel className="mb-2 block">Foto de Perfil</FormLabel>
                      <Tabs value={activeAvatarTab} onValueChange={(v) => setActiveAvatarTab(v as 'upload' | 'url')}>
                        <TabsList>
                          <TabsTrigger value="upload">Subir desde dispositivo</TabsTrigger>
                          <TabsTrigger value="url">Pegar URL</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload" className="mt-4">
                          <div className="flex items-center gap-3">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSelectedFile(file);
                                setImageError(false);
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={!selectedFile}
                              onClick={async () => {
                                if (!selectedFile) return;
                                try {
                                  const path = await uploadAvatar(selectedFile);
                                  setDbUser((prev) => (prev ? { ...prev, photo_path: path } as DBUser : prev));
                                  try {
                                    const signed = await getSignedAvatarUrl(path, 3600);
                                    setAvatarPreviewUrl(signed);
                                  } catch {}
                                  profileForm.setValue('photoURL', '');
                                  toast({ title: 'Imagen subida', description: 'Tu avatar ha sido subida de forma segura.' });
                                } catch (error) {
                                  toast({ variant: 'destructive', title: 'Error al subir', description: handleSupabaseError(error) });
                                }
                              }}
                            >
                              <Upload className="mr-2 h-4 w-4" /> Subir
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Formatos recomendados: JPG/PNG. Máx 5MB.</p>
                        </TabsContent>
                        <TabsContent value="url" className="mt-4">
                          <FormField
                            control={profileForm.control}
                            name="photoURL"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL de Foto de Perfil</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="https://tu-cdn.com/avatar.png"
                                    {...field}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      setImageError(false);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                )}

                {!isEditing && (dbUser.photo_url || dbUser.photo_path) && (
                  <p className="text-xs text-muted-foreground">
                    Avatar: {dbUser.photo_url ? 'URL externa' : 'Almacenado de forma privada'}
                  </p>
                )}

                {isEditing && (
                  <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {profileForm.formState.isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="security">
        <Card>
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>
              Cambia tu contraseña aquí.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-8">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña Actual (no requerida)</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nueva Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {passwordForm.formState.isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
