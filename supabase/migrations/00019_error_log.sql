-- ============================================================================
-- AN ERROR NOBODY SEES IS AN ERROR THAT KEEPS HAPPENING.
--
-- Until now a failure on the live site produced a friendly page for the member
-- and a console.error nobody reads. Vercel keeps runtime logs briefly and you
-- have to go and look at them, which means in practice they are never looked at.
-- Two failures in this codebase are deliberately silent, and both matter:
-- a moderator alert that could not send, and Upstash being unreachable so rate
-- limiting is quietly switched off. Neither reaches anybody today.
--
-- WHY A TABLE AND NOT SENTRY. Sentry would be a new processor in the privacy
-- policy, an SDK calling out on every page, and the end of this product's
-- zero-third-party-network-calls property. For something a table does, that is a
-- bad trade for an app whose whole argument is that it does not leak you
-- anywhere.
--
-- The honest cost: if the DATABASE is what is broken, nothing is recorded here.
-- Vercel's own logs remain the fallback for that case and docs/RECOVERY.md says
-- so rather than implying this covers everything.
--
-- WHAT IS DELIBERATELY NOT STORED, which is the important part.
--
-- Next.js hands onRequestError a `request` object containing `path` and
-- `headers`. Headers include cookies, which means live session tokens, and path
-- includes concrete ids: /games/3f9a... ties an error to a game and therefore to
-- the people in it. Most examples log the whole object. This stores neither.
--
-- `route` here is context.routePath, the route PATTERN: /games/[id], never
-- /games/3f9a. No headers, no cookies, no query strings, no user id. The caller
-- also redacts anything email- or uuid-shaped out of the message before it
-- arrives, because a Postgres unique-violation will happily quote the address
-- that collided.
--
-- The consequence is that this table holds no personal data at all, which is
-- what keeps it out of the privacy policy. That is worth more than knowing which
-- member hit it.
--
-- GROUPED, so one broken page is one row. A member reloading fifty times is a
-- count of fifty, not fifty rows.
-- ============================================================================

create table public.error_log (
  -- md5 of the grouping key, so an upsert needs no lookup first.
  fingerprint text primary key,

  message text not null check (char_length(message) <= 500),
  route text not null check (char_length(route) <= 200),
  route_type text check (char_length(route_type) <= 40),
  method text check (char_length(method) <= 10),
  source text not null default 'server' check (source in ('server', 'client')),

  occurrences integer not null default 1 check (occurrences > 0),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),

  -- When this row was included in a digest email. Null means not yet told.
  notified_at timestamptz
);

comment on table public.error_log is
  'Server and client failures, grouped and counted. Contains no personal data by construction: route patterns rather than paths, no headers, no user ids, and the caller redacts email and uuid shapes from the message.';

create index error_log_recent_idx on public.error_log (last_seen desc);

alter table public.error_log enable row level security;

create policy error_log_select_moderator on public.error_log
  for select using (public.is_moderator());

grant select on public.error_log to authenticated;

-- ── Recording ──────────────────────────────────────────────────────────────

create or replace function public.record_error(
  p_message text,
  p_route text,
  p_route_type text default null,
  p_method text default null,
  p_source text default 'server'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fp text;
begin
  -- Truncated rather than rejected: an over-long message must never turn one
  -- failure into two.
  p_message := left(coalesce(nullif(trim(p_message), ''), 'Unknown error'), 500);
  p_route   := left(coalesce(nullif(trim(p_route), ''), 'unknown'), 200);

  fp := md5(p_message || '|' || p_route || '|' || coalesce(p_source, 'server'));

  insert into public.error_log (fingerprint, message, route, route_type, method, source)
  values (fp, p_message, p_route, left(p_route_type, 40), left(p_method, 10),
          case when p_source = 'client' then 'client' else 'server' end)
  on conflict (fingerprint) do update
    set occurrences = public.error_log.occurrences + 1,
        last_seen   = now(),
        -- A recurrence after a digest went out is news again.
        notified_at = null;
end;
$$;

-- ── The digest ─────────────────────────────────────────────────────────────
--
-- Returns everything not yet reported, and stamps it, but only if an hour has
-- passed since the last digest went out. So a crash loop that fires four
-- thousand times sends one email, not four thousand. It cannot flood by
-- construction, which is why it needs no rate limiter of its own.
--
-- Nothing schedules this. It is called after recording an error, which is the
-- only moment there is anything new to say, and it keeps the rule this schema
-- has followed since 00001: nothing needs a cron job to be correct.

create or replace function public.claim_error_digest()
returns table (message text, route text, source text, occurrences integer, last_seen timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Two requests failing at the same instant must not both send an email.
  perform pg_advisory_xact_lock(hashtext('deuce.error_digest'));

  if exists (
    select 1 from public.error_log where notified_at > now() - interval '1 hour'
  ) then
    return; -- One went out recently. Nothing to say yet.
  end if;

  return query
  update public.error_log e
  set notified_at = now()
  where e.notified_at is null
  returning e.message, e.route, e.source, e.occurrences, e.last_seen;
end;
$$;

-- ── Reading ────────────────────────────────────────────────────────────────

create or replace function public.deuce_errors()
returns table (
  message text, route text, route_type text, source text,
  occurrences integer, first_seen timestamptz, last_seen timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Not yours to read.' using errcode = 'insufficient_privilege';
  end if;

  return query
  select e.message, e.route, e.route_type, e.source,
         e.occurrences, e.first_seen, e.last_seen
  from public.error_log e
  order by e.last_seen desc
  limit 50;
end;
$$;

-- record_error and claim_error_digest are called by the instrumentation hook,
-- which runs outside any request and authenticates with the secret key. They are
-- deliberately NOT granted to authenticated: a member must not be able to write
-- rows into the operator's error list.
grant execute on function public.record_error(text, text, text, text, text) to service_role;
grant execute on function public.claim_error_digest() to service_role;
grant execute on function public.deuce_errors() to authenticated;
