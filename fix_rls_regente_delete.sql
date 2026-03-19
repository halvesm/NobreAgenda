-- Allow Regentes and PCAs to delete bookings in their assigned spaces
DROP POLICY IF EXISTS "Regentes can delete bookings in their spaces" ON public.bookings;

CREATE POLICY "Regentes can delete bookings in their spaces"
ON public.bookings
FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('Regente', 'PCA', 'Admin', 'Coord', 'Gestor', 'admin')
  OR
  user_id = auth.uid()
);
