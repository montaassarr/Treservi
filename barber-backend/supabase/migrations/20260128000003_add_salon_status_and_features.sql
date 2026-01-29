-- Add status and additional fields to salons table
alter table public.salons add column if not exists status text default 'active' check (status in ('active', 'suspended', 'cancelled'));
alter table public.salons add column if not exists logo_url text;
alter table public.salons add column if not exists subscription_plan text default 'free' check (subscription_plan in ('free', 'starter', 'professional', 'enterprise'));
alter table public.salons add column if not exists contact_phone text;
alter table public.salons add column if not exists contact_email text;
alter table public.salons add column if not exists address text;
alter table public.salons add column if not exists city text;
alter table public.salons add column if not exists country text;

-- Create indexes for commonly queried fields
create index if not exists salons_status_idx on public.salons(status);
create index if not exists salons_subscription_plan_idx on public.salons(subscription_plan);
create index if not exists salons_owner_email_idx on public.salons(owner_email);

-- Add total_revenue tracking for salons
alter table public.salons add column if not exists total_revenue numeric(15, 2) default 0;

-- Create a function to update salon total revenue when appointments change
create or replace function update_salon_revenue()
returns trigger as $$
declare
  appointment_amount numeric(10, 2);
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if new.status = 'Completed' then
      update public.salons 
      set total_revenue = total_revenue + coalesce(new.amount, 0)
      where id = new.salon_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'Completed' then
      update public.salons 
      set total_revenue = total_revenue - coalesce(old.amount, 0)
      where id = old.salon_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger for revenue updates
drop trigger if exists appointment_revenue_trigger on public.appointments;

create trigger appointment_revenue_trigger
  after insert or update or delete on public.appointments
  for each row
  execute function update_salon_revenue();

-- Allow super admins to view all salons
create policy "Super admins can view all salons"
  on public.salons for select
  using (is_user_super_admin(auth.uid()));

-- Allow super admins to view salon statistics (if needed for analytics)
grant select on public.salons to authenticated;
