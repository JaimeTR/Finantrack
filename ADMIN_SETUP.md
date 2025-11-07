# Configuración del Panel de Administración

## ✅ Cambios Realizados en el Código

### 1. Hook `useAdmin` Mejorado
**Archivo:** `src/firebase/auth/use-admin.ts`

- Detección inmediata del super admin por email (`jaimetr1309@gmail.com`)
- Manejo robusto de estados de carga
- Fallback a custom claims para admins regulares

### 2. Layout Admin Protegido
**Archivo:** `src/app/admin/layout.tsx`

- Bloquea el render completo hasta verificar permisos
- Muestra "Verificando acceso..." durante la carga
- Redirige automáticamente si no es admin
- No renderiza children hasta confirmar autorización

### 3. Página Admin con Gating Estricto
**Archivo:** `src/app/admin/page.tsx`

- La query de usuarios **solo se crea cuando `isAdmin === true`**
- No intenta listar usuarios durante la verificación de permisos
- Maneja estados de carga, sin datos y sin permisos

## 🔥 Despliegue de Reglas de Firestore

### Opción 1: Consola de Firebase (Recomendado)

1. Abre la [Consola de Firebase](https://console.firebase.google.com)
2. Selecciona tu proyecto: **studio-9006781906-69e34**
3. Ve a **Firestore Database** → **Reglas**
4. Copia y pega el contenido de `firestore.rules` (líneas 52-58):

```javascript
// Super admin por correo específico (permiso de desarrollo/controlado)
function isSuperAdmin() {
    return isSignedIn() && request.auth.token.email == 'jaimetr1309@gmail.com';
}

allow get: if isOwner(userId) || isAdmin() || isSuperAdmin();
allow list: if isAdmin() || isSuperAdmin();
```

5. Haz clic en **Publicar**

### Opción 2: Firebase CLI (Si tienes firebase.json)

```powershell
npx firebase-tools deploy --only firestore:rules
```

## 🧪 Pasos para Probar

### 1. Limpiar Caché del Navegador
```
Ctrl + Shift + R (recarga dura)
O
Ctrl + Shift + Delete → Borrar caché
```

### 2. Cerrar Sesión y Volver a Entrar
- Cierra sesión en la app
- Inicia sesión con: **jaimetr1309@gmail.com**
- Esto fuerza la recarga del token de autenticación

### 3. Navegar a /admin
```
http://localhost:9002/admin
```

**Comportamiento esperado:**
1. Verás "Verificando acceso..." brevemente
2. Si eres admin → Se carga la tabla de usuarios
3. Si no eres admin → Mensaje "Acceso no autorizado"

### 4. Verificar en la Consola del Navegador
Abre DevTools (F12) y busca:
- ✅ Sin errores de "Missing or insufficient permissions"
- ✅ Log de users cargados correctamente
- ❌ Ningún intento de query antes de verificar permisos

## 🔍 Diagnóstico de Problemas

### Si aún aparece error de permisos:

#### A. Verificar que las reglas están desplegadas
1. Ve a Consola Firebase → Firestore → Reglas
2. Confirma que aparece la función `isSuperAdmin()`
3. Verifica la fecha de última publicación

#### B. Verificar el token de Auth
Ejecuta en la consola del navegador (estando logueado):
```javascript
firebase.auth().currentUser.getIdTokenResult().then(token => {
  console.log('Email:', token.claims.email);
  console.log('Role:', token.claims.role);
  console.log('All claims:', token.claims);
});
```

#### C. Forzar recarga del token
Si el email no aparece en los claims:
```javascript
firebase.auth().currentUser.getIdToken(true).then(token => {
  console.log('Token refrescado');
  location.reload();
});
```

#### D. Verificar en Firestore
1. Ve a Firestore Database en la consola
2. Abre la colección `users`
3. Busca el documento con tu UID
4. Confirma que tiene:
   - `email: jaimetr1309@gmail.com`
   - `accountType: Free|Premium|Student`
   - `role: user|admin` (opcional)

## 📋 Funcionalidades del Panel Admin

### Lista de Usuarios
- ✅ Búsqueda por nombre, email, rol o tipo
- ✅ Ordenamiento alfabético
- ✅ Contador total y filtrado
- ✅ Botón de recarga manual

### Cambio de Tipo de Cuenta
- ✅ Dropdown para cada usuario
- ✅ Opciones: Free, Premium, Student
- ✅ Actualización inmediata en Firestore
- ✅ Toast de confirmación

### Próximas Mejoras Sugeridas
- [ ] Paginación (limit + startAfter)
- [ ] Edición de rol (user ↔ admin)
- [ ] Suspensión temporal de cuenta
- [ ] Exportar lista a CSV
- [ ] Filtros avanzados (solo premium, solo admins, etc.)

## 🛡️ Seguridad

### Super Admin por Email (Actual)
**Ventajas:**
- Configuración inmediata sin backend
- No requiere cloud functions
- Ideal para desarrollo y testing

**Desventajas:**
- Email hardcodeado en las reglas
- No escalable para múltiples admins

### Migración a Custom Claims (Recomendado para producción)

1. Crear Cloud Function para asignar rol:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const setAdminClaim = functions.https.onCall(async (data, context) => {
  // Solo el super admin puede asignar roles
  if (context.auth?.token.email !== 'jaimetr1309@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'No autorizado');
  }
  
  await admin.auth().setCustomUserClaims(data.uid, { role: 'admin' });
  return { success: true };
});
```

2. Actualizar reglas para usar solo claims:
```javascript
function isAdmin() {
  return isSignedIn() && request.auth.token.role == 'admin';
}

allow list: if isAdmin();
```

## 📞 Soporte

Si después de seguir estos pasos el error persiste:
1. Comparte el contenido de `firebase.auth().currentUser.getIdTokenResult()`
2. Confirma la fecha de publicación de las reglas en la consola
3. Verifica que estás accediendo con el email correcto

---
**Última actualización:** 6 de noviembre de 2025
**Estado:** Código actualizado, pendiente despliegue de reglas
