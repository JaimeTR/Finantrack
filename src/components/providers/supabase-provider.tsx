'use client';

// ============================================
// SUPABASE PROVIDER
// ============================================
// Provider de React para Supabase con gestión de autenticación
// ============================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { User as DBUser } from '@/lib/supabase/types';

interface SupabaseContextType {
  user: User | null;
  userProfile: DBUser | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<DBUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Cargar perfil si hay usuario
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar perfil del usuario desde la base de datos
  async function loadUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        setUserProfile(null);
        setIsAdmin(false);
      } else {
  setUserProfile(data as DBUser);
        // Verificar si es admin
        const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const row = data as DBUser;
  // Determinar admin a partir del role/email local como fallback
  let adminFlag = row.role === 'admin' || row.email === superAdminEmail;

  // Además, consultar la función server-side is_current_user_admin() que
  // puede basarse en claims o en la tabla admin_emails. Esto cubre casos donde
  // el role no está en la fila local pero el usuario está autorizado por la DB.
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('is_current_user_admin');
    if (!rpcErr && Array.isArray(rpcData)) {
      // supabase.rpc may return [{ is_current_user_admin: true }] or [true]
      const val = (rpcData as any)[0];
      if (typeof val === 'object' && val !== null) {
        adminFlag = adminFlag || Object.values(val).some((v) => v === true);
      } else if (val === true) {
        adminFlag = true;
      }
    } else if (!rpcErr && typeof rpcData === 'boolean') {
      adminFlag = adminFlag || rpcData;
    }
  } catch (e) {
    // ignore rpc errors and rely on local check
    console.warn('Error checking is_current_user_admin RPC', e);
  }

  setIsAdmin(adminFlag);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }

  const value = {
    user,
    userProfile,
    session,
    isLoading,
    isAdmin,
  };

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

// Hook para usar el contexto de Supabase
export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}

// Hook simplificado para obtener solo el usuario
export function useUser() {
  const { user, userProfile, isLoading } = useSupabase();
  return { user, userProfile, isLoading };
}

// Hook para verificar si es admin
export function useAdmin() {
  const { isAdmin, isLoading } = useSupabase();
  return { isAdmin, isAdminLoading: isLoading };
}
