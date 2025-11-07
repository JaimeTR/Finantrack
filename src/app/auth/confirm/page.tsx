"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentSession, getCurrentUser } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const [status, setStatus] = useState<
    "loading" | "verified" | "check" | "error"
  >("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    // Comprobar si el usuario ya está autenticado o si la verificación fue procesada
    async function check() {
      try {
        const session = await getCurrentSession();
        if (session?.user) {
          setStatus("verified");
          setMessage("Correo verificado y sesión activa. ¡Bienvenido!");
          return;
        }

        // Intentar obtener el usuario por si hay sesión sin token en session
        const user = await getCurrentUser().catch(() => null);
        if (user) {
          setStatus("verified");
          setMessage("Correo verificado y sesión activa. ¡Bienvenido!");
        } else {
          // Si no hay usuario, lo normal es mostrar instrucción de iniciar sesión
          setStatus("check");
          setMessage(
            "Si la verificación se procesó, ya puedes iniciar sesión. Si no, revisa el enlace o solicita uno nuevo."
          );
        }
      } catch (err) {
        console.error("Confirm page check error:", err);
        setStatus("error");
        setMessage("Ocurrió un error al verificar el estado. Intenta de nuevo más tarde.");
      }
    }

    check();
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-lg p-8 shadow">
        <h1 className="text-2xl font-semibold mb-4">Confirmación de correo</h1>

        {status === "loading" && <p className="text-sm">Comprobando estado...</p>}

        {status === "verified" && (
          <>
            <p className="mb-4">{message}</p>
            <div className="flex gap-3">
              <Link href="/login" className="btn btn-primary">
                Iniciar sesión
              </Link>
              <Link href="/" className="btn">
                Ir al inicio
              </Link>
            </div>
          </>
        )}

        {status === "check" && (
          <>
            <p className="mb-4">{message}</p>
            <div className="flex gap-3">
              <Link href="/login" className="btn btn-primary">
                Iniciar sesión
              </Link>
              <Link href="/signup" className="btn">
                Volver a registrarme
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <p className="mb-4 text-red-600">{message}</p>
            <div className="flex gap-3">
              <Link href="/" className="btn">
                Volver
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
