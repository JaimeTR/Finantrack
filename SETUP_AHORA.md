# 🚀 CONFIGURACIÓN INMEDIATA - 3 PASOS

## ✅ PASO 1: Ejecutar el Schema en Supabase (2 minutos)

### Abrir el SQL Editor
1. Ve a: **https://yxdeamlacaqbsawzpxxy.supabase.co**
2. Login con tu cuenta de Supabase
3. En el menú lateral izquierdo, busca **"SQL Editor"**
4. Click en **"New query"**

### Ejecutar el Schema
1. Abre el archivo: `supabase/schema.sql` en VS Code
2. Selecciona TODO el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en el SQL Editor de Supabase (Ctrl+V)
5. Click en **"Run"** (botón verde abajo a la derecha)
6. Deberías ver: ✅ **"Success. No rows returned"**

### Verificar que Funcionó
1. Ve a **"Table Editor"** en el menú lateral
2. Deberías ver estas 5 tablas:
   - ✅ users
   - ✅ transactions
   - ✅ budgets
   - ✅ goals
   - ✅ goal_contributions

---

## ✅ PASO 2: Verificar la Conexión (1 minuto)

En tu terminal de PowerShell:

```powershell
# Verificar que todo está conectado
node supabase/verify-connection.js
```

**Resultado esperado:**
```
🔍 Verificando conexión con Supabase...
✅ Test 1: Conexión básica
✅ Conexión establecida correctamente
✅ Test 2: Verificando tablas...
✅ Tabla "users" existe
✅ Tabla "transactions" existe
✅ Tabla "budgets" existe
✅ Tabla "goals" existe
✅ Tabla "goal_contributions" existe
✅ Test 3: Verificando sistema de autenticación...
✅ Sistema de autenticación listo
🎉 ¡TODO LISTO!
```

**Si aparece error "relation does not exist":**
→ Vuelve al Paso 1 y ejecuta el schema.sql

---

## ✅ PASO 3: Probar Registro de Usuario (2 minutos)

### Opción A: Desde Supabase Dashboard (Más Rápido)

1. Ve a **Authentication** → **Users** en tu dashboard
2. Click en **"Add user"** → **"Create new user"**
3. Completa:
   - Email: `jaimetr1309@gmail.com`
   - Password: (elige una)
   - Desactiva "Auto Confirm User" ✅
4. Click en **"Create user"**
5. Ve a **Table Editor** → **users**
6. Deberías ver tu usuario creado automáticamente por el trigger

### Opción B: Desde tu App (Requiere migrar código)

Solo si ya actualizaste las páginas de login/signup:

```powershell
# Reiniciar servidor para cargar .env.local
npm run dev
```

Luego:
1. Ve a: http://localhost:9002/signup
2. Registra un usuario
3. Verifica en Supabase Dashboard → Authentication → Users

---

## 🎯 Checklist de Estado Actual

- [x] Proyecto Supabase creado
- [x] Variables de entorno configuradas (.env.local)
- [x] Dependencias instaladas (@supabase/supabase-js)
- [ ] Schema SQL ejecutado en Supabase ← **HAZLO AHORA**
- [ ] Verificación de conexión exitosa
- [ ] Primer usuario de prueba creado

---

## 📋 Siguiente: Migrar el Código

Una vez completados los 3 pasos anteriores, sigue con:

### Opción 1: Migración Completa
Lee: **`QUICK_START_SUPABASE.md`** - Tiene código listo para copiar/pegar

### Opción 2: Migración Gradual
1. Solo Auth primero (login/signup)
2. Luego dashboard
3. Luego el resto

---

## 🆘 Troubleshooting Rápido

### Error: "relation does not exist"
→ No ejecutaste el schema.sql, ve al Paso 1

### Error: "Invalid API key"
→ Verifica que .env.local tiene las variables correctas

### Error: "Authentication failed"
→ Asegúrate de que el email no tiene espacios extra

### No aparece nada en Table Editor
→ Espera 5 segundos y refresca la página

---

## 🎉 Cuando Todo Funcione

Verás en Supabase Dashboard:
- ✅ 5 tablas en Table Editor
- ✅ Políticas RLS en cada tabla (pestaña Policies)
- ✅ Usuarios en Authentication → Users
- ✅ Datos en las tablas cuando uses la app

---

**¿Todo listo?** Abre el SQL Editor y ejecuta el schema.sql ahora! 🚀
