-- FINANTRACK - SCHEMA IDEMPOTENTE
-- Este script está pensado para ejecutarse sobre una base que puede contener
-- ya algunas tablas. Usa CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE
-- para funciones y bloques DO para agregar constraints que dependen del orden.
-- Recomendación: ejecútalo primero en un entorno de desarrollo.

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABLA: users (crear primero para FKs)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT,
  photo_path TEXT,
  account_type TEXT NOT NULL DEFAULT 'Free' CHECK (account_type IN ('Free','Premium','Student')),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Otras tablas (creadas sin FK en el CREATE para evitar orden)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  spent NUMERIC NOT NULL DEFAULT 0 CHECK (spent >= 0),
  period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  notes TEXT,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Añadir FKs solo si no existen (usa pg_constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'transactions' AND c.conname = 'transactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'budgets' AND c.conname = 'budgets_user_id_fkey'
  ) THEN
    ALTER TABLE public.budgets
      ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'goals' AND c.conname = 'goals_user_id_fkey'
  ) THEN
    ALTER TABLE public.goals
      ADD CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'goal_contributions' AND c.conname = 'goal_contributions_goal_id_fkey'
  ) THEN
    ALTER TABLE public.goal_contributions
      ADD CONSTRAINT goal_contributions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'goal_contributions' AND c.conname = 'goal_contributions_user_id_fkey'
  ) THEN
    ALTER TABLE public.goal_contributions
      ADD CONSTRAINT goal_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- INDICES (si no existen)
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
CREATE INDEX IF NOT EXISTS users_account_type_idx ON public.users(account_type);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON public.transactions(type);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON public.transactions(category);
CREATE INDEX IF NOT EXISTS budgets_user_id_idx ON public.budgets(user_id);
CREATE INDEX IF NOT EXISTS budgets_period_idx ON public.budgets(period);
CREATE INDEX IF NOT EXISTS budgets_user_period_idx ON public.budgets(user_id, period);
CREATE INDEX IF NOT EXISTS goals_user_id_idx ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS goals_status_idx ON public.goals(status);
CREATE INDEX IF NOT EXISTS goals_target_date_idx ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS goal_contributions_goal_id_idx ON public.goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS goal_contributions_user_id_idx ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS goal_contributions_date_idx ON public.goal_contributions(contributed_at DESC);

-- TRIGGERS Y FUNCIONES (CREATE OR REPLACE)

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- trigger para users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'update_users_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- trigger para transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'update_transactions_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER update_transactions_updated_at
      BEFORE UPDATE ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- trigger para budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'update_budgets_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER update_budgets_updated_at
      BEFORE UPDATE ON public.budgets
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- trigger para goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'update_goals_updated_at' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER update_goals_updated_at
      BEFORE UPDATE ON public.goals
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- trigger para goal_contributions: update_goal_amount
CREATE OR REPLACE FUNCTION public.update_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.goals
  SET current_amount = current_amount + NEW.amount,
      status = CASE WHEN (current_amount + NEW.amount) >= target_amount THEN 'completed' ELSE status END
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'after_contribution_insert' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER after_contribution_insert
      AFTER INSERT ON public.goal_contributions
      FOR EACH ROW EXECUTE FUNCTION public.update_goal_amount();
  END IF;
END$$;

-- Función para crear perfil al registrarse (trigger en auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, photo_url, account_type, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'Free',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  -- crea trigger en schema auth sólo si existe la tabla auth.users (entorno Supabase)
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid WHERE c.relname = 'users' AND n.nspname = 'auth') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t WHERE t.tgname = 'on_auth_user_created'
    ) THEN
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
  END IF;
END$$;

-- update_budget_spent trigger
CREATE OR REPLACE FUNCTION public.update_budget_spent()
RETURNS TRIGGER AS $$
DECLARE
  v_period TEXT;
BEGIN
  v_period := TO_CHAR((NEW.date AT TIME ZONE 'America/Lima'), 'YYYY-MM');
  IF NEW.type = 'expense' THEN
    INSERT INTO public.budgets (user_id, category, period, spent, amount)
    VALUES (NEW.user_id, NEW.category, v_period, NEW.amount, 0)
    ON CONFLICT (user_id, category, period)
    DO UPDATE SET spent = public.budgets.spent + EXCLUDED.spent;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE t.tgname = 'after_transaction_insert' AND n.nspname = 'public'
  ) THEN
    CREATE TRIGGER after_transaction_insert
      AFTER INSERT ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.update_budget_spent();
  END IF;
END$$;

-- get_financial_summary
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_user_id UUID, p_period TEXT)
RETURNS TABLE (total_income DECIMAL, total_expenses DECIMAL, balance DECIMAL, transaction_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS balance,
    COUNT(*) AS transaction_count
  FROM public.transactions
  WHERE user_id = p_user_id
    AND TO_CHAR((date AT TIME ZONE 'America/Lima'), 'YYYY-MM') = p_period;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- VISTAS (CREATE OR REPLACE VIEW)
CREATE OR REPLACE VIEW public.recent_transactions_view AS
SELECT
  t.id,
  t.user_id,
  u.name AS user_name,
  u.email AS user_email,
  t.description,
  t.amount,
  t.type,
  t.category,
  t.date,
  t.created_at
FROM public.transactions t
JOIN public.users u ON t.user_id = u.id
ORDER BY t.date DESC;

CREATE OR REPLACE VIEW public.goals_progress_view AS
SELECT
  g.id,
  g.user_id,
  u.name AS user_name,
  g.name AS goal_name,
  g.target_amount,
  g.current_amount,
  ROUND((g.current_amount / NULLIF(g.target_amount, 0)) * 100, 2) AS progress_percentage,
  g.target_date,
  g.status,
  COUNT(gc.id) AS contribution_count,
  g.created_at
FROM public.goals g
JOIN public.users u ON g.user_id = u.id
LEFT JOIN public.goal_contributions gc ON g.id = gc.goal_id
GROUP BY g.id, u.name;

-- Habilitar RLS en tablas relevantes (si no está habilitado)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- FUNCIONES HELPER para comprobar admin / super-admin (SECURITY DEFINER)
-- Helper functions reading JWT claims to avoid querying protected tables (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
DECLARE
  jwt_role TEXT;
  jwt_email TEXT;
BEGIN
  -- read JWT claims exposed by Postgres (if present). Use missing_ok=true to avoid errors when not present.
  jwt_role := current_setting('jwt.claims.role', true);
  jwt_email := current_setting('jwt.claims.email', true);

  IF jwt_role IS NOT NULL AND jwt_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Allow a specific super-admin email as admin as well
  IF jwt_email IS NOT NULL AND jwt_email = 'jaimetr1309@gmail.com' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  jwt_email TEXT;
BEGIN
  jwt_email := current_setting('jwt.claims.email', true);
  RETURN jwt_email IS NOT NULL AND jwt_email = 'jaimetr1309@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabla para listar administradores por email. Agregar administradores con INSERT ...
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY
);

-- POLÍTICAS (DROP + CREATE idempotente)

-- users: usuarios pueden ver/insert/update/actualizar su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create own profile" ON public.users;
CREATE POLICY "Users can create own profile"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- policies admin usando helper functions para evitar recursión
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT USING ( public.is_current_user_admin() );

DROP POLICY IF EXISTS "Admins can update any user" ON public.users;
CREATE POLICY "Admins can update any user"
  ON public.users FOR UPDATE USING ( public.is_current_user_admin() );

DROP POLICY IF EXISTS "Super admin can delete users" ON public.users;
CREATE POLICY "Super admin can delete users"
  ON public.users FOR DELETE USING ( public.is_super_admin() );

-- transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;
CREATE POLICY "Users can create own transactions"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- budgets
DROP POLICY IF EXISTS "Users can view own budgets" ON public.budgets;
CREATE POLICY "Users can view own budgets"
  ON public.budgets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own budgets" ON public.budgets;
CREATE POLICY "Users can create own budgets"
  ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON public.budgets;
CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON public.budgets;
CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- goals
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
CREATE POLICY "Users can create own goals"
  ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- goal_contributions
DROP POLICY IF EXISTS "Users can view contributions to own goals" ON public.goal_contributions;
CREATE POLICY "Users can view contributions to own goals"
  ON public.goal_contributions FOR SELECT USING (
    auth.uid() = user_id OR EXISTS (
      SELECT 1 FROM public.goals g WHERE g.id = goal_contributions.goal_id AND g.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create contributions to own goals" ON public.goal_contributions;
CREATE POLICY "Users can create contributions to own goals"
  ON public.goal_contributions FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.goals g WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

-- POLITICAS STORAGE (avatars) - si existe schema storage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    EXECUTE $$
      DROP POLICY IF EXISTS "Owner can read own avatar" ON storage.objects;
      CREATE POLICY "Owner can read own avatar"
        ON storage.objects FOR SELECT TO authenticated
        USING (
          bucket_id = 'avatars'
          AND split_part(name, '/', 1) = auth.uid()::text
        );

      DROP POLICY IF EXISTS "Authenticated can upload own avatar" ON storage.objects;
      CREATE POLICY "Authenticated can upload own avatar"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'avatars'
          AND split_part(name, '/', 1) = auth.uid()::text
        );

      DROP POLICY IF EXISTS "Authenticated can update own avatar" ON storage.objects;
      CREATE POLICY "Authenticated can update own avatar"
        ON storage.objects FOR UPDATE TO authenticated
        USING (
          bucket_id = 'avatars'
          AND split_part(name, '/', 1) = auth.uid()::text
        )
        WITH CHECK (
          bucket_id = 'avatars'
          AND split_part(name, '/', 1) = auth.uid()::text
        );

      DROP POLICY IF EXISTS "Authenticated can delete own avatar" ON storage.objects;
      CREATE POLICY "Authenticated can delete own avatar"
        ON storage.objects FOR DELETE TO authenticated
        USING (
          bucket_id = 'avatars'
          AND split_part(name, '/', 1) = auth.uid()::text
        );
    $$;
  END IF;
END$$;

-- COMENTARIOS
COMMENT ON TABLE public.users IS 'Perfiles de usuario sincronizados con Supabase Auth';
COMMENT ON TABLE public.transactions IS 'Transacciones financieras (ingresos y gastos)';
COMMENT ON TABLE public.budgets IS 'Presupuestos mensuales por categoría';
COMMENT ON TABLE public.goals IS 'Metas de ahorro de usuarios';
COMMENT ON TABLE public.goal_contributions IS 'Contribuciones individuales a metas';

-- FIN
