// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================
// Cliente de Supabase para uso en el navegador (componentes cliente)
// ============================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Validar que las variables de entorno estén configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Crear cliente de Supabase con tipos
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir sesión en localStorage
    persistSession: true,
    // Detectar cambios en la sesión (logout en otra pestaña, etc.)
    autoRefreshToken: true,
    // Refrescar token automáticamente antes de que expire
    detectSessionInUrl: true,
    // Storage para persistencia (puedes cambiar a 'cookie' para SSR)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  // Opciones globales para queries
  global: {
    headers: {
      'x-client-info': 'finantrack-nextjs',
    },
  },
  // Configuración de tiempo de espera
  db: {
    schema: 'public',
  },
  // Configuración de realtime (opcional)
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Obtener el usuario autenticado actual
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Obtener la sesión actual
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Verificar si el usuario es admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    // Verificar si es super admin por email
    if (user.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) {
      return true;
    }

    // Verificar en la base de datos
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !data) return false;
    return (data as { role: 'user' | 'admin' }).role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Cerrar sesión
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Registrar nuevo usuario
 */
export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Iniciar sesión con email y contraseña
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Iniciar sesión con Google
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Enviar email de recuperación de contraseña
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
  return data;
}

/**
 * Actualizar contraseña
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

/**
 * Actualizar perfil de usuario
 */
export async function updateProfile(updates: {
  name?: string;
  photo_url?: string;
  photo_path?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  const { data, error } = await (supabase as any)
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Subir avatar de usuario
 */
export async function uploadAvatar(file: File) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No user logged in');

  // Generar nombre único para el archivo
  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  if (!['jpg','jpeg','png','webp'].includes(fileExt)) {
    throw new Error('Formato no permitido. Usa JPG, JPEG, PNG o WEBP');
  }
  const safeBase = 'profile';
  const ts = Date.now();
  const fileName = `${user.id}/${safeBase}-${ts}.${fileExt}`;

  // Subir archivo
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true, // Reemplazar si ya existe
    });

  if (uploadError) throw uploadError;
  // Guardar ruta privada en el perfil
  await updateProfile({ photo_path: fileName, photo_url: undefined });
  return fileName;
}

/**
 * Generar URL firmada temporal para un avatar privado
 */
export async function getSignedAvatarUrl(path: string, expiresInSeconds = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl as string;
}

/**
 * Helper para manejar errores de Supabase
 */
export function handleSupabaseError(error: any): string {
  if (!error) return 'Unknown error';

  // Errores de auth
  if (error.message?.includes('Invalid login credentials')) {
    return 'Credenciales inválidas. Verifica tu email y contraseña.';
  }
  if (error.message?.includes('Email not confirmed')) {
    return 'Por favor verifica tu email antes de iniciar sesión.';
  }
  if (error.message?.includes('User already registered')) {
    return 'Este email ya está registrado.';
  }

  // Errores de permisos (RLS)
  if (error.message?.includes('row-level security')) {
    return 'No tienes permisos para realizar esta acción.';
  }

  // Error genérico
  return error.message || 'Ha ocurrido un error';
}

// ============================================
// TIPOS DE AYUDA
// ============================================

export type SupabaseClient = typeof supabase;
