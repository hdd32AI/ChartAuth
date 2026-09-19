create table public.chartauth_worklist (
case_key text primary key, scenario text not null check(scenario in ('A','B','C')),
first_name text not null,last_name text not null,patient_id text unique not null,member_id text unique not null,
dob text not null,service_date text not null,visit_time text not null,plan_name text not null,location text not null,service_type text not null,status text not null);
alter table public.chartauth_worklist enable row level security;
revoke all on public.chartauth_worklist from public,anon,authenticated;
grant select on public.chartauth_worklist to service_role;
create index chartauth_worklist_scenario_idx on public.chartauth_worklist(scenario,case_key);
insert into public.chartauth_worklist select 'CW'||lpad((i+1)::text,4,'0'),substr('ABC',i%3+1,1),(array['Avery','Morgan','Riley','Casey','Quinn','Rowan','Taylor','Cameron','Parker','Reese','Hayden','Jordan','Sage','Emerson','Finley','Alex','Blair','Drew','Elliot','Harper'])[i%20+1],(array['Bennett','Brooks','Carter','Collins','Davis','Ellis','Foster','Gray','Hayes','Hughes','Lane','Lee','Morgan','Parker','Reed','Rivera','Scott','Shaw','Stone','Wells','Adams','Bailey','Bell','Clark','Cooper','Evans','Green','Hall','Hill','James','Kelly','King','Lewis','Long','Martin','Moore','Morris','Nelson','Perry','Price','Reynolds','Ross','Sanders','Smith','Taylor','Thomas','Turner','Walker','Ward','Young'])[i/20+1],'SYN-P'||(10001+i),'SYN-M'||(20001+i),(1965+i%40)||'-'||lpad((1+i%12)::text,2,'0')||'-'||lpad((1+i%27)::text,2,'0'),'2026-09-'||lpad((21+i%7)::text,2,'0'),lpad((8+(i/4)%9)::text,2,'0')||':'||lpad((i%4*15)::text,2,'0'),(array['Demo Select PPO','Demo Choice PPO','Demo Access PPO'])[(i/7)%3+1],(array['North clinic','Central clinic','South clinic'])[(i/3)%3+1],'physical_therapy','Needs verification' from generate_series(0,999) i;

alter table public.chartauth_worklist drop constraint if exists chartauth_worklist_scenario_check;
alter table public.chartauth_worklist add column if not exists scenario_family text;
alter table public.chartauth_worklist add column if not exists scenario_label text;
update public.chartauth_worklist w set scenario='S'||lpad((i%50+1)::text,2,'0'),
scenario_family=(array['authorization_required','authorization_not_required','out_of_network','authorization_unknown','cost_share_missing','coverage_inactive','member_mismatch','service_date_mismatch','payer_mismatch','coverage_unknown'])[(i%50)/5+1],
scenario_label=(array['Authorization required','No authorization required','Out-of-network benefit','Authorization status missing','Cost share missing','Inactive coverage','Member mismatch','Service-date mismatch','Payer mismatch','Coverage unknown'])[(i%50)/5+1]||' · '||replace((array['physical_therapy','occupational_therapy','office_visit','specialist_consultation','diagnostic_lab'])[i%5+1],'_',' '),
service_type=(array['physical_therapy','occupational_therapy','office_visit','specialist_consultation','diagnostic_lab'])[i%5+1]
from generate_series(0,999) i where w.case_key='CW'||lpad((i+1)::text,4,'0');
alter table public.chartauth_worklist alter column scenario_family set not null;
alter table public.chartauth_worklist alter column scenario_label set not null;
alter table public.chartauth_worklist add constraint chartauth_worklist_scenario_check check(scenario ~ '^S(0[1-9]|[1-4][0-9]|50)$');
select count(*) as visits,count(distinct scenario) as scenarios,count(distinct scenario_family) as conditions,count(distinct service_type) as services from public.chartauth_worklist;
