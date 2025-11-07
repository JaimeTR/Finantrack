// ============================================
// SCRIPT DE VERIFICACIÓN DE SUPABASE
// ============================================
// Ejecuta este script para verificar la conexión con Supabase
// node supabase/verify-connection.js
// ============================================

const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Asegúrate de tener .env.local con:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
  console.log('🔍 Verificando conexión con Supabase...');
  console.log('📍 URL:', supabaseUrl);
  console.log('');

  try {
    // Test 1: Verificar conexión básica
    console.log('✅ Test 1: Conexión básica');
    const { data: healthData, error: healthError } = await supabase
      .from('users')
      .select('count');
    
    if (healthError && healthError.message.includes('relation "public.users" does not exist')) {
      console.log('⚠️  La tabla "users" no existe todavía');
      console.log('');
      console.log('📋 SIGUIENTE PASO:');
      console.log('1. Ve a: https://yxdeamlacaqbsawzpxxy.supabase.co');
      console.log('2. Abre el SQL Editor');
      console.log('3. Copia y pega TODO el contenido de: supabase/schema.sql');
      console.log('4. Ejecuta el script (botón Run)');
      console.log('5. Vuelve a ejecutar este script para verificar');
      console.log('');
      return false;
    }

    if (healthError) {
      console.error('❌ Error al conectar:', healthError.message);
      return false;
    }

    console.log('✅ Conexión establecida correctamente');
    console.log('');

    // Test 2: Verificar tablas
    console.log('✅ Test 2: Verificando tablas...');
    const tables = ['users', 'transactions', 'budgets', 'goals', 'goal_contributions'];
    
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ Tabla "${table}" no encontrada o error: ${error.message}`);
        return false;
      } else {
        console.log(`✅ Tabla "${table}" existe`);
      }
    }
    console.log('');

    // Test 3: Verificar autenticación
    console.log('✅ Test 3: Verificando sistema de autenticación...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.log('⚠️  Error en auth:', authError.message);
    } else {
      console.log('✅ Sistema de autenticación listo');
      console.log('   Sesión actual:', authData.session ? 'Activa' : 'No hay sesión');
    }
    console.log('');

    // Resumen
    console.log('🎉 ¡TODO LISTO!');
    console.log('');
    console.log('📝 Próximos pasos:');
    console.log('1. Actualiza src/app/layout.tsx para usar SupabaseProvider');
    console.log('2. Actualiza las páginas de login/signup');
    console.log('3. Reinicia el servidor: npm run dev');
    console.log('4. Prueba registrar un usuario en: http://localhost:9002/signup');
    console.log('');
    console.log('📚 Guías:');
    console.log('- QUICK_START_SUPABASE.md → Código listo para copiar');
    console.log('- SUPABASE_MIGRATION.md → Guía completa paso a paso');
    console.log('');

    return true;

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    return false;
  }
}

// Ejecutar verificación
verifyConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
