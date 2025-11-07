
-- Sumar contribución a meta
CREATE OR REPLACE FUNCTION update_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.goals
  SET current_amount = current_amount + NEW.amount,
      status = CASE WHEN (current_amount + NEW.amount) >= target_amount THEN 'completed' ELSE status END
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS after_contribution_insert ON public.goal_contributions;
CREATE TRIGGER after_contribution_insert
  AFTER INSERT ON public.goal_contributions
  FOR EACH ROW EXECUTE FUNCTION update_goal_amount();

-- Crear perfil de usuario al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Actualizar budgets.spent al registrar gasto (mes según America/Lima)
CREATE OR REPLACE FUNCTION update_budget_spent()
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

DROP TRIGGER IF EXISTS after_transaction_insert ON public.transactions;
CREATE TRIGGER after_transaction_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_budget_spent();

-- Resumen financiero por mes (America/Lima)
CREATE OR REPLACE FUNCTION get_financial_summary(p_user_id UUID, p_period TEXT)
RETURNS TABLE (
  total_income DECIMAL,
  total_expenses DECIMAL,
  balance DECIMAL,
  transaction_count BIGINT
) AS $$
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

-- ============================================
-- VISTAS
-- ============================================
CREATE OR REPLACE VIEW recent_transactions_view AS
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

CREATE OR REPLACE VIEW goals_progress_view AS
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

-- ============================================
-- ÍNDICES ADICIONALES
-- ============================================
CREATE INDEX IF NOT EXISTS transactions_user_date_range_idx
  ON public.transactions(user_id, date)
  WHERE type = 'expense';

CREATE INDEX IF NOT EXISTS goals_active_idx
  ON public.goals(user_id, status)
  WHERE status = 'active';

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE public.users IS 'Perfiles de usuario sincronizados con Supabase Auth';
COMMENT ON TABLE public.transactions IS 'Transacciones financieras (ingresos y gastos)';
COMMENT ON TABLE public.budgets IS 'Presupuestos mensuales por categoría';
COMMENT ON TABLE public.goals IS 'Metas de ahorro de usuarios';
COMMENT ON TABLE public.goal_contributions IS 'Contribuciones individuales a metas';

COMMENT ON COLUMN public.users.account_type IS 'Tipo de cuenta: Free, Premium o Student';
COMMENT ON COLUMN public.users.role IS 'Rol del usuario: user o admin';
COMMENT ON COLUMN public.transactions.type IS 'Tipo de transacción: income o expense';
COMMENT ON COLUMN public.budgets.spent IS 'Cantidad gastada del presupuesto (calculado automáticamente)';
COMMENT ON COLUMN public.goals.status IS 'Estado de la meta: active, completed o cancelled';

-- Crear bucket 'avatars' privado si no existe (compatible sin usar storage.create_bucket con named args)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
      -- Intentar insertar con file_size_limit si la columna existe; si no, insertar columnas básicas
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'file_size_limit'
      ) THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit)
        VALUES ('avatars', 'avatars', false, 5242880);
      ELSE
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('avatars', 'avatars', false);
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'Schema storage no disponible en esta instancia.';
  END IF;
END $$;

-- Políticas en storage.objects para bucket avatars (owner-only)
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

-- Recomendación de nombre de archivo: `${auth.uid()}/profile-<ts>.<ext>`

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Para ejecutar este script:
-- 1. Ve a tu proyecto de Supabase
-- 2. Abre el SQL Editor
-- 3. Copia y pega todo este contenido
-- 4. Ejecuta el script
-- ============================================
