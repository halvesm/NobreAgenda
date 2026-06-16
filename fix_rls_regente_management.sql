-- Corrigir Políticas de RLS para permitir que Regentes e Administradores gerenciem seus espaços
-- Este script deve ser executado no SQL Editor do Supabase

-- 1. Remover políticas antigas que podem conflitar
DROP POLICY IF EXISTS "Regentes can delete bookings in their spaces" ON public.bookings;
DROP POLICY IF EXISTS "Regentes can manage bookings in their spaces" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Enable update for owners and space managers" ON public.bookings;
DROP POLICY IF EXISTS "Enable delete for owners and space managers" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert for owners and space managers" ON public.bookings;

-- 2. Criar política unificada para UPDATE
CREATE POLICY "Enable update for owners and space managers"
ON public.bookings
FOR UPDATE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role = 'Administrador' OR
      (role = 'Regente' AND (
        assigned_space_id = bookings.space_id OR 
        assigned_space_ids @> ARRAY[bookings.space_id]
      ))
    )
  )
)
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role = 'Administrador' OR
      (role = 'Regente' AND (
        assigned_space_id = bookings.space_id OR 
        assigned_space_ids @> ARRAY[bookings.space_id]
      ))
    )
  )
);

-- 3. Criar política unificada para DELETE
CREATE POLICY "Enable delete for owners and space managers"
ON public.bookings
FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role = 'Administrador' OR
      (role = 'Regente' AND (
        assigned_space_id = bookings.space_id OR 
        assigned_space_ids @> ARRAY[bookings.space_id]
      ))
    )
  )
);

-- 4. Criar política unificada para INSERT
CREATE POLICY "Enable insert for owners and space managers"
ON public.bookings
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND (
      role = 'Administrador' OR
      (role = 'Regente' AND (
        assigned_space_id = bookings.space_id OR 
        assigned_space_ids @> ARRAY[bookings.space_id]
      ))
    )
  )
);
