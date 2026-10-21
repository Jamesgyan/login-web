do $$ begin create type public.app_role as enum ('admin','user'); exception when duplicate_object then null; end $$;

create table public.profiles (id uuid primary key, full_name text, email text, created_at timestamptz not null default now());
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null, role app_role not null, unique(user_id, role));
create table public.settings (key text primary key, value text not null, updated_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, color text not null default 'blue', created_at timestamptz not null default now());
create table public.budgets (id uuid primary key default gen_random_uuid(), name text not null, amount numeric(12,2) not null default 0, period text not null default 'monthly', owner_id uuid, start_date date not null default current_date, created_at timestamptz not null default now(),
  description text, share_code text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), status text not null default 'active', archived_at timestamptz, allow_join boolean not null default true, meeting_link text, meeting_provider text);
create table public.contributions (id uuid primary key default gen_random_uuid(), budget_id uuid references public.budgets(id) on delete cascade, user_id uuid, contributor_name text, amount numeric(12,2) not null, note text, date date not null default current_date, created_at timestamptz not null default now());
create table public.expenses (id uuid primary key default gen_random_uuid(), budget_id uuid references public.budgets(id) on delete cascade, category_id uuid references public.categories(id) on delete set null, user_id uuid, amount numeric(12,2) not null, description text not null, date date not null default current_date, created_at timestamptz not null default now());
create table public.requests (id uuid primary key default gen_random_uuid(), user_id uuid, budget_id uuid references public.budgets(id) on delete set null, category_id uuid references public.categories(id) on delete set null, title text not null, amount numeric(12,2) not null, reason text, status text not null default 'pending', created_at timestamptz not null default now());
create table public.comments (id uuid primary key default gen_random_uuid(), request_id uuid references public.requests(id) on delete cascade not null, user_id uuid, body text not null, created_at timestamptz not null default now());
create table public.reallocations (id uuid primary key default gen_random_uuid(), from_category_id uuid references public.categories(id) on delete set null, to_category_id uuid references public.categories(id) on delete set null, amount numeric(12,2) not null, reason text, created_by uuid, created_at timestamptz not null default now());
create table public.activity_logs (id uuid primary key default gen_random_uuid(), user_id uuid, action text not null, details text, created_at timestamptz not null default now());
create table public.budget_members (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  unique (budget_id, user_id)
);
create index budget_members_budget_idx on public.budget_members(budget_id);
create index budget_members_user_idx on public.budget_members(user_id);

grant select, insert, update, delete on public.profiles, public.settings, public.categories, public.budgets, public.contributions, public.expenses, public.requests, public.comments, public.reallocations, public.activity_logs, public.budget_members to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.profiles, public.user_roles, public.settings, public.categories, public.budgets, public.contributions, public.expenses, public.requests, public.comments, public.reallocations, public.activity_logs, public.budget_members to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.contributions enable row level security;
alter table public.expenses enable row level security;
alter table public.requests enable row level security;
alter table public.comments enable row level security;
alter table public.reallocations enable row level security;
alter table public.activity_logs enable row level security;
alter table public.budget_members enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "read" on public.settings for select to authenticated using (true);
create policy "admin write" on public.settings for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read" on public.categories for select to authenticated using (true);
create policy "admin write" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "budget read" on public.budgets for select to authenticated using (true);
create policy "budget admin or owner write" on public.budgets for all to authenticated
using (public.has_role(auth.uid(),'admin') or owner_id = auth.uid())
with check (public.has_role(auth.uid(),'admin') or owner_id = auth.uid());
create policy "read" on public.contributions for select to authenticated using (true);
create policy "admin write" on public.contributions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read" on public.expenses for select to authenticated using (true);
create policy "admin write" on public.expenses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "read" on public.reallocations for select to authenticated using (true);
create policy "admin write" on public.reallocations for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "requests read" on public.requests for select to authenticated using (user_id = auth.uid() or user_id is null or public.has_role(auth.uid(),'admin'));
create policy "requests insert own" on public.requests for insert to authenticated with check (user_id = auth.uid());
create policy "requests admin manage" on public.requests for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "requests admin delete" on public.requests for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "comments read" on public.comments for select to authenticated using (exists (select 1 from public.requests r where r.id = request_id and (r.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "comments insert own" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "activity read" on public.activity_logs for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "activity insert own" on public.activity_logs for insert to authenticated with check (user_id = auth.uid());
create policy "members can read their membership" on public.budget_members for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin') or exists (select 1 from public.budgets b where b.id = budget_id and b.owner_id = auth.uid()));
create policy "users can join active shared budgets" on public.budget_members for insert to authenticated
with check ((user_id = auth.uid() and exists (select 1 from public.budgets b where b.id = budget_id and b.allow_join = true and b.status = 'active')) or public.has_role(auth.uid(),'admin'));
create policy "admins manage memberships" on public.budget_members for update to authenticated
using (public.has_role(auth.uid(),'admin') or exists (select 1 from public.budgets b where b.id = budget_id and b.owner_id = auth.uid()))
with check (public.has_role(auth.uid(),'admin') or exists (select 1 from public.budgets b where b.id = budget_id and b.owner_id = auth.uid()));
create policy "admins delete memberships" on public.budget_members for delete to authenticated
using (public.has_role(auth.uid(),'admin') or exists (select 1 from public.budgets b where b.id = budget_id and b.owner_id = auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.settings (key, value) values ('currency','USD'), ('organization_name','Budget Manager');
insert into public.categories (id, name, color) values
 ('11111111-0000-0000-0000-000000000001','Food','blue'),
 ('11111111-0000-0000-0000-000000000002','Transport','sky'),
 ('11111111-0000-0000-0000-000000000003','Utilities','indigo'),
 ('11111111-0000-0000-0000-000000000004','Events','cyan');
insert into public.budgets (id, name, amount, period) values
 ('22222222-0000-0000-0000-000000000001','Monthly Operations',5000,'monthly'),
 ('22222222-0000-0000-0000-000000000002','Community Events',2000,'quarterly');
insert into public.contributions (budget_id, contributor_name, amount, note, date) values
 ('22222222-0000-0000-0000-000000000001','Alex Morgan',1500,'Monthly share', current_date - 20),
 ('22222222-0000-0000-0000-000000000001','Priya Shah',1200,'Monthly share', current_date - 18),
 ('22222222-0000-0000-0000-000000000002','Sam Lee',800,'Event fund', current_date - 10);
insert into public.expenses (budget_id, category_id, amount, description, date) values
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',420,'Groceries', current_date - 15),
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002',180,'Fuel', current_date - 12),
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000003',260,'Electricity bill', current_date - 8),
 ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',540,'Venue booking', current_date - 5),
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',95,'Snacks', current_date - 2);
insert into public.requests (budget_id, category_id, title, amount, reason, status) values
 ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004','Decorations for meetup',150,'Banners and lights','pending'),
 ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002','Taxi reimbursement',45,'Airport pickup','approved');
insert into public.reallocations (from_category_id, to_category_id, amount, reason) values
 ('11111111-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000004',100,'Event needs');
insert into public.activity_logs (action, details) values ('Budget created','Monthly Operations'), ('Expense added','Groceries $420'), ('Request approved','Taxi reimbursement');