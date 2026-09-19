create table public.chartauth_access_config (id integer primary key check(id=1),salt text not null,password_hash text not null);
create table public.chartauth_access_sessions (token_hash text primary key,expires_at timestamptz not null default now()+interval '12 hours');
create table public.chartauth_login_attempts (created_at timestamptz not null default now());
alter table public.chartauth_access_config enable row level security;
alter table public.chartauth_access_sessions enable row level security;
alter table public.chartauth_login_attempts enable row level security;
revoke all on public.chartauth_access_config,public.chartauth_access_sessions,public.chartauth_login_attempts from public,anon,authenticated;
grant select on public.chartauth_access_config to service_role;
grant select,insert,delete on public.chartauth_access_sessions,public.chartauth_login_attempts to service_role;
create function public.chartauth_login_allowed() returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(76140329);
 delete from public.chartauth_login_attempts where created_at < now()-interval '10 minutes';
 if (select count(*) from public.chartauth_login_attempts)>=30 then return false; end if;
 insert into public.chartauth_login_attempts default values;
 delete from public.chartauth_access_sessions where expires_at < now();
 return true;
end;
$$;
revoke all on function public.chartauth_login_allowed() from public,anon,authenticated;
grant execute on function public.chartauth_login_allowed() to service_role;
