-- ============================================================================
-- FILING AND RESOLVING A REPORT.
--
-- Separate from 00005 because PostgreSQL will not let a value added to an enum
-- be USED in the same transaction that added it. The notification kinds arrived
-- there; this is where they are written.
-- ============================================================================

/**
 * Confirms to the reporter that their report was received.
 *
 * A report that disappears into silence teaches somebody not to send the next
 * one, and the next one might be the one that matters. The subject is told
 * NOTHING at this point, deliberately: see resolve_report below.
 */
create or replace function public.confirm_report_filed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (
    new.reporter_id,
    'report_filed',
    new.game_id,
    null,
    'Your report has been sent to a student moderator. We will tell you what happens.'
  );
  return new;
end;
$$;

create trigger reports_confirm_to_reporter
  after insert on public.reports
  for each row execute function public.confirm_report_filed();

/**
 * RESOLVE A REPORT.
 *
 * Three outcomes, each with a written reason: a warning, a ban, or a dismissal.
 * The reason is the whole point of the record. It is what the person is told and
 * the only account of why somebody decided what they decided.
 *
 * WHO IS TOLD, AND WHEN.
 *
 *   The reporter, always. They asked; they hear back.
 *
 *   The subject, only on a WARNING or a BAN. Never on a dismissal, and never at
 *   the moment of filing. This is the one piece of the design worth explaining,
 *   because the obvious version is wrong: a padel game has four people and a
 *   tennis game has two, so telling somebody "you were reported" hands them a
 *   list of two or three candidates. The report form promises the reporter
 *   confidentiality, and confidentiality survives only if the FACT of the report
 *   stays quiet too. A dismissed report therefore leaves no trace the subject
 *   can see, which is also the correct outcome for an allegation nobody upheld.
 *
 * A MODERATOR MAY RESOLVE A REPORT ABOUT THEMSELVES. That is a deliberate
 * choice for a single-moderator deployment, where the alternative is a report
 * that can never be closed by anybody. It is recorded like any other, and the
 * moderator page says plainly when the subject is the person deciding.
 */
create or replace function public.resolve_report(
  p_report_id uuid,
  p_outcome text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.reports;
  note text := nullif(trim(coalesce(p_note, '')), '');
  me uuid := auth.uid();
begin
  if not public.is_moderator() then
    raise exception 'Only a moderator can resolve a report.' using errcode = 'insufficient_privilege';
  end if;

  if p_outcome not in ('warning', 'ban', 'dismissed') then
    raise exception 'An outcome is a warning, a ban, or a dismissal.' using errcode = 'check_violation';
  end if;

  -- Locked, so two moderators pressing at once cannot both resolve it and send
  -- two contradictory decisions to the same person.
  select * into r from public.reports where id = p_report_id for update;

  if r.id is null then
    raise exception 'That report no longer exists.' using errcode = 'no_data_found';
  end if;
  if r.status <> 'open' then
    raise exception 'That report has already been resolved.' using errcode = 'check_violation';
  end if;
  if note is null then
    raise exception 'Write a short reason. It is what the people involved are told.'
      using errcode = 'check_violation';
  end if;

  if p_outcome = 'dismissed' then
    update public.reports
    set status = 'dismissed', outcome = null, resolution_note = note,
        resolved_by = me, resolved_at = now()
    where id = p_report_id;
  else
    update public.reports
    set status = 'actioned', outcome = p_outcome::public.report_outcome,
        resolution_note = note, resolved_by = me, resolved_at = now()
    where id = p_report_id;
  end if;

  -- A ban takes effect immediately and everywhere: is_member() is what every
  -- policy in the schema asks, so this one column closes the whole product.
  if p_outcome = 'ban' then
    update public.profiles
    set banned_at = now(), banned_reason = note
    where id = r.subject_id;
  end if;

  -- The reporter, always.
  insert into public.notifications (user_id, kind, game_id, actor_id, body)
  values (
    r.reporter_id,
    'report_resolved',
    r.game_id,
    null,
    case p_outcome
      when 'dismissed' then 'A moderator reviewed your report and did not act on it. ' || note
      when 'warning'   then 'A moderator reviewed your report and issued a warning. ' || note
      else                  'A moderator reviewed your report and removed that account. ' || note
    end
  );

  -- The subject, only when something was actually done about them.
  if p_outcome <> 'dismissed' then
    insert into public.notifications (user_id, kind, game_id, actor_id, body)
    values (
      r.subject_id,
      'moderation_decision',
      r.game_id,
      null,
      case p_outcome
        when 'warning' then 'A moderator has given you a warning. ' || note
        else                'Your account has been closed by a moderator. ' || note
      end
    );
  end if;
end;
$$;

grant execute on function public.resolve_report(uuid, text, text) to authenticated;

-- Resolution goes through the function, which holds the lock, applies the ban
-- and sends the right notices. Direct UPDATE would do none of that.
drop policy reports_update_moderator on public.reports;
