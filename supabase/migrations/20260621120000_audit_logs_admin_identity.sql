alter table public.audit_logs
  add column if not exists admin_id uuid references public.profiles(id) on delete set null;

create index if not exists audit_logs_admin_id_idx on public.audit_logs (admin_id);

drop policy if exists "audit_logs_select_super_admin" on public.audit_logs;
drop policy if exists "audit_logs_select_admin_scope" on public.audit_logs;
create policy "audit_logs_select_admin_scope"
  on public.audit_logs
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
    or (
      admin_id = auth.uid()
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'super_admin')
      )
    )
  );

drop policy if exists "audit_logs_insert_super_admin" on public.audit_logs;
drop policy if exists "audit_logs_insert_admin_scope" on public.audit_logs;
create policy "audit_logs_insert_admin_scope"
  on public.audit_logs
  for insert
  with check (
    admin_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );
