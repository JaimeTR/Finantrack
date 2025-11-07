# 🚀 Migración de Firebase a Supabase - FinanTrack

## 📋 Guía Completa de Migración

Esta guía te llevará paso a paso desde Firebase hacia Supabase, manteniendo toda la funcionalidad de tu aplicación.

---

## 🎯 Paso 1: Crear Proyecto en Supabase

### 1.1 Registro y Creación
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en **"New Project"**
4. Completa los datos:
   - **Name**: FinanTrack
   - **Database Password**: (guarda esta contraseña en un lugar seguro)
   - **Region**: Selecciona la más cercana (ej: South America - São Paulo)
   - **Pricing Plan**: Free (perfecto para desarrollo)
5. Clic en **"Create new project"**
6. Espera 2-3 minutos mientras se provisiona

### 1.2 Obtener Credenciales
Una vez creado el proyecto:
1. Ve a **Settings** → **API**
2. Copia estos valores (los necesitarás):
   - **Project URL**: `https://tu-proyecto.supabase.co`
   - **anon/public key**: `eyJhbG...` (clave pública)
   - **service_role key**: `eyJhbG...` (clave privada - NO expongas en cliente)

---

## 🗄️ Paso 2: Configurar Base de Datos

### 2.1 Ejecutar Script de Schema
1. En Supabase Dashboard, ve a **SQL Editor**
2. Clic en **"New query"**
3. Abre el archivo `supabase/schema.sql` de este proyecto
4. Copia TODO el contenido del archivo
5. Pégalo en el editor SQL de Supabase
6. Clic en **"Run"** (esquina inferior derecha)
7. Deberías ver: ✅ Success. No rows returned

### 2.2 Verificar Creación
1. Ve a **Table Editor** en el menú lateral
2. Deberías ver estas tablas:
   - ✅ users
   - ✅ transactions
   - ✅ budgets
   - ✅ goals
   - ✅ goal_contributions

### 2.3 Verificar Políticas RLS
1. Selecciona la tabla **users**
2. Ve a la pestaña **Policies**
3. Deberías ver políticas como:
   - "Users can view own profile"
   - "Admins can view all users"
   - etc.

---

## 🔐 Paso 3: Configurar Autenticación

### 3.1 Habilitar Proveedores de Auth

#### Email/Password (Ya está habilitado por defecto)
1. Ve a **Authentication** → **Providers**
2. **Email** debe estar activado ✅

#### Google OAuth (Opcional)
1. En **Authentication** → **Providers** → **Google**
2. Activa el toggle
3. Necesitarás:
   - **Client ID** de Google Cloud Console
   - **Client Secret** de Google Cloud Console
4. Pasos para obtenerlos:
   ```
   a) Ve a https://console.cloud.google.com
   b) Crea un proyecto o selecciona uno existente
   c) Habilita "Google+ API"
   d) Ve a "Credenciales" → "Crear credenciales" → "ID de cliente OAuth"
   e) Configura el consentimiento (pantalla de consentimiento OAuth)
   f) Tipo de aplicación: "Aplicación web"
   g) Authorized redirect URIs: https://tu-proyecto.supabase.co/auth/v1/callback
   h) Copia Client ID y Client Secret
   ```
5. Pega las credenciales en Supabase
6. Guarda

### 3.2 Configurar URLs de Redirección
1. Ve a **Authentication** → **URL Configuration**
2. Agrega estas URLs:
   - **Site URL**: `http://localhost:9002` (desarrollo)
   - **Redirect URLs**: 
     ```
     http://localhost:9002/dashboard
     http://localhost:9002/auth/callback
     ```

### 3.3 Configurar Email Templates (Opcional)
1. Ve a **Authentication** → **Email Templates**
2. Personaliza:
   - Confirmation email (verificación de cuenta)
   - Reset password email
   - Magic link email

---

## 📦 Paso 4: Instalar Dependencias

### 4.1 Instalar Supabase Client
```powershell
npm install @supabase/supabase-js
```

### 4.2 Desinstalar Firebase (Opcional - hazlo al final)
```powershell
# Solo cuando todo funcione con Supabase
# npm uninstall firebase
```

---

## ⚙️ Paso 5: Configurar Variables de Entorno

### 5.1 Crear archivo .env.local
Crea o actualiza el archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Super Admin (para panel de administración)
NEXT_PUBLIC_SUPER_ADMIN_EMAIL=jaimetr1309@gmail.com

# Opcional: para desarrollo local
NEXT_PUBLIC_APP_URL=http://localhost:9002
```

### 5.2 Agregar a .gitignore
Asegúrate de que `.env.local` está en tu `.gitignore`:
```gitignore
.env.local
.env*.local
```

---

## 🔄 Paso 6: Migrar Código de la Aplicación

### 6.1 Archivos a Crear/Reemplazar

Los siguientes archivos se crearán en los próximos pasos:

```
src/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Cliente de Supabase
│   │   ├── server.ts          # Cliente del lado del servidor (SSR)
│   │   ├── types.ts           # Tipos generados de la DB
│   │   └── queries.ts         # Funciones de consulta reutilizables
│   └── types.ts               # Tipos existentes (actualizar)
├── components/
│   └── providers/
│       └── supabase-provider.tsx  # Provider de React
├── hooks/
│   ├── use-user.ts            # Hook para usuario autenticado
│   ├── use-transactions.ts    # Hook para transacciones
│   ├── use-budgets.ts         # Hook para presupuestos
│   └── use-goals.ts           # Hook para metas
└── app/
    └── auth/
        └── callback/
            └── route.ts       # Callback de OAuth
```

### 6.2 Archivos de Firebase a Mantener Temporalmente
Durante la transición, mantén estos archivos:
- `src/firebase/*` (hasta confirmar que todo funciona)
- `firestore.rules` (como referencia)

---

## 🧪 Paso 7: Testing y Verificación

### 7.1 Checklist de Testing
- [ ] Registro de nuevo usuario
- [ ] Login con email/password
- [ ] Login con Google (si lo configuraste)
- [ ] Verificación de email
- [ ] Reset de contraseña
- [ ] Crear transacción (ingreso/gasto)
- [ ] Editar transacción
- [ ] Eliminar transacción
- [ ] Crear presupuesto
- [ ] Ver dashboard con datos
- [ ] Crear meta de ahorro
- [ ] Agregar contribución a meta
- [ ] Acceso a panel admin (con tu email)
- [ ] Cambiar tipo de cuenta desde admin
- [ ] Búsqueda de usuarios en admin
- [ ] Editar perfil de usuario
- [ ] Subir foto de perfil (si implementas Storage)

### 7.2 Verificar RLS en Producción
1. Crea dos usuarios de prueba
2. Intenta acceder a datos del otro usuario desde el navegador:
   ```javascript
   // Desde DevTools Console
   const { data } = await supabase
     .from('transactions')
     .select('*')
     .eq('user_id', 'otro-uuid');
   
   console.log(data); // Debería estar vacío si RLS funciona
   ```

---

## 🎨 Paso 8: Migrar Storage (Opcional)

Si usas Firebase Storage para fotos de perfil:

### 8.1 Crear Bucket
1. Ve a **Storage** en Supabase
2. Clic en **"New bucket"**
3. Nombre: `avatars`
4. **Public bucket**: activado ✅
5. Configurar políticas:

```sql
-- Permitir que usuarios vean cualquier avatar
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Usuarios pueden subir solo su propio avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Usuarios pueden actualizar solo su propio avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Usuarios pueden eliminar solo su propio avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 8.2 Estructura de Carpetas
```
avatars/
├── {user_id}/
│   └── profile.jpg
```

---

## 📊 Paso 9: Migrar Datos Existentes (Opcional)

Si tienes datos en Firebase que quieres migrar:

### 9.1 Exportar desde Firebase
```powershell
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Exportar Firestore
firebase firestore:export ./firebase-backup --project tu-proyecto-firebase
```

### 9.2 Script de Migración
Crearemos un script Node.js para migrar los datos en los próximos pasos.

---

## 🚀 Paso 10: Deploy a Producción

### 10.1 Actualizar Variables de Entorno en Vercel/Netlify
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-produccion
NEXT_PUBLIC_SUPER_ADMIN_EMAIL=jaimetr1309@gmail.com
```

### 10.2 Configurar URLs de Producción en Supabase
1. Ve a **Authentication** → **URL Configuration**
2. Actualiza:
   - **Site URL**: `https://tu-dominio.com`
   - **Redirect URLs**: `https://tu-dominio.com/dashboard`

### 10.3 Deploy
```powershell
# Si usas Vercel
vercel --prod

# O haz push a tu rama main para deploy automático
git push origin main
```

---

## 🆘 Troubleshooting Común

### Problema: "Invalid JWT"
**Solución**: El token expiró. Cierra sesión y vuelve a iniciar.
```javascript
await supabase.auth.signOut();
```

### Problema: "Row Level Security policy violation"
**Solución**: Verifica que las políticas RLS estén correctamente configuradas.
1. Ve a Table Editor → Selecciona tabla → Policies
2. Revisa que las condiciones coincidan con tu lógica

### Problema: "Email not confirmed"
**Solución**: 
1. En desarrollo: desactiva confirmación de email
   - **Authentication** → **Settings** → **Email Auth**
   - Desactiva "Confirm email"
2. En producción: configura SMTP personalizado

### Problema: No aparecen datos
**Solución**: Verifica que el user_id en las queries coincide con auth.uid()
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user?.id);

const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', user.id);
console.log('Transactions:', data);
```

---

## 📚 Recursos Adicionales

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth Helpers Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Checklist Final

Antes de considerar la migración completa:

- [ ] Proyecto Supabase creado
- [ ] Schema SQL ejecutado sin errores
- [ ] Todas las tablas visibles en Table Editor
- [ ] RLS habilitado en todas las tablas
- [ ] Auth providers configurados
- [ ] Variables de entorno configuradas
- [ ] Código migrado y funcionando en local
- [ ] Tests pasando
- [ ] Storage configurado (si aplica)
- [ ] Deploy a producción exitoso
- [ ] Verificación completa en producción
- [ ] Backup de datos de Firebase (por si acaso)

---

## 🎉 ¡Migración Completada!

Una vez que todo funcione correctamente:

1. Desinstala Firebase:
```powershell
npm uninstall firebase
```

2. Elimina archivos de Firebase:
```powershell
Remove-Item -Recurse -Force src\firebase
Remove-Item firestore.rules
```

3. Actualiza el README del proyecto
4. Celebra 🎉

---

**Nota**: Guarda esta documentación para referencia futura y para ayudar a otros miembros del equipo.
