create table public.chartauth_sessions (
  token_hash text primary key,
  revision integer not null default 0,
  state jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  constraint chartauth_token_format check (token_hash ~ '^[0-9a-f]{64}$')
);
alter table public.chartauth_sessions enable row level security;
revoke all on public.chartauth_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.chartauth_sessions to service_role;
create index chartauth_created_idx on public.chartauth_sessions (created_at);

create function public.chartauth_create(p_hash text, p_state jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(76140328);
  if (select count(*) from public.chartauth_sessions where created_at > now() - interval '1 hour') >= 240 then
    return false;
  end if;
  delete from public.chartauth_sessions where expires_at < now() - interval '1 day';
  insert into public.chartauth_sessions(token_hash,state) values(p_hash,p_state);
  return true;
end;
$$;
revoke all on function public.chartauth_create(text,jsonb) from public, anon, authenticated;
grant execute on function public.chartauth_create(text,jsonb) to service_role;
