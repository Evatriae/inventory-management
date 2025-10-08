-- Create profiles table for user management
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'staff')),
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Policies for profiles
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Create items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text,
  image_url text,
  status text not null default 'available' check (status in ('available', 'borrowed', 'reserved')),
  current_borrower_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.items enable row level security;

-- Policies for items - everyone can view, only staff can modify
create policy "items_select_all"
  on public.items for select
  using (true);

create policy "items_insert_staff"
  on public.items for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "items_update_staff"
  on public.items for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "items_delete_staff"
  on public.items for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

-- Create borrow_requests table
create table if not exists public.borrow_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('borrow', 'reserve')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  requested_at timestamp with time zone default now(),
  approved_at timestamp with time zone,
  borrowed_at timestamp with time zone,
  expected_return_at timestamp with time zone,
  returned_at timestamp with time zone,
  approved_by uuid references public.profiles(id) on delete set null,
  notes text
);

alter table public.borrow_requests enable row level security;

-- Policies for borrow_requests
create policy "borrow_requests_select_own"
  on public.borrow_requests for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

create policy "borrow_requests_insert_own"
  on public.borrow_requests for insert
  with check (auth.uid() = user_id);

create policy "borrow_requests_update_staff"
  on public.borrow_requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'staff'
    )
  );

-- Create trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'role', 'user')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
