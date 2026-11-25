-- Demo data for App Store screenshots and the Apple reviewer account.
-- Targets ONLY practicetracker.help+demo@gmail.com — safe to re-run any time
-- (deletes and re-inserts that single user's sessions before writing fresh ones).
--
-- Prerequisite: this account must already exist — sign up with this exact email
-- in the app first (and confirm it, if email confirmation is on). This script only
-- looks the user up by email; it does not create the auth account itself.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'practicetracker.help+demo@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for practicetracker.help+demo@gmail.com — sign up with this email in the app first, then re-run this script.';
  END IF;

  -- Wipe this user's existing practice data (session_timings/repertoire cascade via
  -- their own FKs) so the script can be re-run freely before another screenshot round.
  DELETE FROM public.sessions WHERE user_id = v_user_id;

  -- Profile: fixed demo identity, practice goal 3h/day, no purchase (unlocked=false)
  -- so the Apple reviewer can test the real purchase flow themselves.
  INSERT INTO public.profiles (
    id, email, name, practice_goal, instrument, theme, unlocked,
    push_notifications_enabled, daily_reminder_enabled, daily_reminder_time, session_timer_alerts_enabled
  )
  VALUES (
    v_user_id, 'practicetracker.help+demo@gmail.com', 'Alex Morgan', 3, 'string', 'classical', false,
    true, false, '09:00', true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    practice_goal = EXCLUDED.practice_goal,
    instrument = EXCLUDED.instrument,
    theme = EXCLUDED.theme,
    unlocked = EXCLUDED.unlocked;

  -- Sessions: Sep 1 - Oct 7, 2026, one rest day per week (Sep 6/13/20/27, Oct 4) —
  -- 32 practice days, day_number sequential 1..32 with no gaps, matching exactly how
  -- the app itself numbers sessions created in chronological order.
  INSERT INTO public.sessions (user_id, date, day_number, notes)
  SELECT v_user_id, d::date, n, note FROM (
    VALUES
      ('2026-09-01'::date, 1,  'First day back in the practice room this month. Warmed up with scales, then worked through the opening of the Bach.'),
      ('2026-09-02'::date, 2,  NULL),
      ('2026-09-03'::date, 3,  'Slow practice on the Sibelius opening — intonation much better today.'),
      ('2026-09-04'::date, 4,  NULL),
      ('2026-09-05'::date, 5,  'Big practice day. Memorized the first page of the Bach — finally feels secure without the score. Ran the Sibelius exposition twice at tempo, still need to work on the double stops in the development. Paganini No. 24 variations are coming along; variation 6 needs more left-hand strength. Good week overall.'),
      -- Sep 6: rest day
      ('2026-09-07'::date, 6,  NULL),
      ('2026-09-08'::date, 7,  'Worked on phrasing in the Mozart first movement cadenza.'),
      ('2026-09-09'::date, 8,  NULL),
      ('2026-09-10'::date, 9,  'Bruch slow movement is starting to feel more expressive. Ran the orchestral excerpts list for the upcoming audition.'),
      ('2026-09-11'::date, 10, NULL),
      ('2026-09-12'::date, 11, 'Short but focused session — isolated the tricky shift in the Sibelius second movement.'),
      -- Sep 13: rest day
      ('2026-09-14'::date, 12, NULL),
      ('2026-09-15'::date, 13, 'Spent extra time on excerpts — Don Juan opening is much cleaner now.'),
      ('2026-09-16'::date, 14, 'One of the better sessions this month. The Bach is really settling in — played through both movements without stopping for the first time. Bruch concerto''s first movement cadenza is finally under control after isolating the double-stop passage yesterday. Finished with a long scales and arpeggios block to reset intonation before putting the instrument down.'),
      ('2026-09-17'::date, 15, NULL),
      ('2026-09-18'::date, 16, 'Mozart phrasing lesson prep — ran through with the metronome.'),
      ('2026-09-19'::date, 17, NULL),
      -- Sep 20: rest day
      ('2026-09-21'::date, 18, 'Back to the Bach after the break — memory held up well.'),
      ('2026-09-22'::date, 19, NULL),
      ('2026-09-23'::date, 20, 'Sibelius development section finally clicking — the double stops feel secure now.'),
      ('2026-09-24'::date, 21, NULL),
      ('2026-09-25'::date, 22, 'Mock audition run-through with a friend listening — excerpts felt solid.'),
      ('2026-09-26'::date, 23, 'Long Saturday session. Paganini No. 24 — all the variations are up to tempo now, just need to polish the ricochet bowing in the final variation. Sibelius concerto felt the most confident it''s ever been, recorded myself and the intonation held up on playback. Finished with a full pass of the audition excerpts list.'),
      -- Sep 27: rest day
      ('2026-09-28'::date, 24, NULL),
      ('2026-09-29'::date, 25, 'Working on a lighter bow stroke for the Mozart finale.'),
      ('2026-09-30'::date, 26, NULL),
      ('2026-10-01'::date, 27, 'New month, same focus — Sibelius and Paganini both felt easier today than last week.'),
      ('2026-10-02'::date, 28, NULL),
      ('2026-10-03'::date, 29, 'Good balance of solo and concerto repertoire today.'),
      -- Oct 4: rest day
      ('2026-10-05'::date, 30, 'Strong Monday session. Sibelius concerto run-through start to finish, only minor fixes needed in the cadenza. Paganini Caprice 24 is close to performance-ready. Spent the last block on the Mozart finale, lightened the bow stroke like we discussed in the last lesson — much more stylistically appropriate now.'),
      ('2026-10-06'::date, 31, NULL),
      ('2026-10-07'::date, 32, 'Finishing the week strong — the Bach and Bruch are both in good shape heading into next week.')
  ) AS v(d, n, note);

  -- Practice timings: 1-3 per day, 30-120 min each, 90-240 min/day total.
  INSERT INTO public.session_timings (session_id, duration_minutes)
  SELECT s.id, t.minutes
  FROM public.sessions s
  JOIN (
    VALUES
      ('2026-09-01'::date, 60), ('2026-09-01'::date, 45),
      ('2026-09-02'::date, 90),
      ('2026-09-03'::date, 60), ('2026-09-03'::date, 60),
      ('2026-09-04'::date, 45), ('2026-09-04'::date, 45),
      ('2026-09-05'::date, 60), ('2026-09-05'::date, 60), ('2026-09-05'::date, 60),
      ('2026-09-07'::date, 45), ('2026-09-07'::date, 45),
      ('2026-09-08'::date, 60), ('2026-09-08'::date, 60),
      ('2026-09-09'::date, 90),
      ('2026-09-10'::date, 60), ('2026-09-10'::date, 45),
      ('2026-09-11'::date, 60), ('2026-09-11'::date, 60),
      ('2026-09-12'::date, 30), ('2026-09-12'::date, 60), ('2026-09-12'::date, 30),
      ('2026-09-14'::date, 60), ('2026-09-14'::date, 60),
      ('2026-09-15'::date, 45), ('2026-09-15'::date, 45), ('2026-09-15'::date, 45),
      ('2026-09-16'::date, 75), ('2026-09-16'::date, 75), ('2026-09-16'::date, 60),
      ('2026-09-17'::date, 60), ('2026-09-17'::date, 30),
      ('2026-09-18'::date, 60), ('2026-09-18'::date, 60),
      ('2026-09-19'::date, 45), ('2026-09-19'::date, 45),
      ('2026-09-21'::date, 60), ('2026-09-21'::date, 60),
      ('2026-09-22'::date, 90),
      ('2026-09-23'::date, 60), ('2026-09-23'::date, 45),
      ('2026-09-24'::date, 60), ('2026-09-24'::date, 60),
      ('2026-09-25'::date, 45), ('2026-09-25'::date, 45), ('2026-09-25'::date, 45),
      ('2026-09-26'::date, 75), ('2026-09-26'::date, 60), ('2026-09-26'::date, 75),
      ('2026-09-28'::date, 60), ('2026-09-28'::date, 45),
      ('2026-09-29'::date, 60), ('2026-09-29'::date, 60),
      ('2026-09-30'::date, 90),
      ('2026-10-01'::date, 60), ('2026-10-01'::date, 60),
      ('2026-10-02'::date, 45), ('2026-10-02'::date, 45),
      ('2026-10-03'::date, 60), ('2026-10-03'::date, 60), ('2026-10-03'::date, 30),
      ('2026-10-05'::date, 75), ('2026-10-05'::date, 75), ('2026-10-05'::date, 60),
      ('2026-10-06'::date, 60), ('2026-10-06'::date, 45),
      ('2026-10-07'::date, 60), ('2026-10-07'::date, 60)
  ) AS t(session_date, minutes) ON t.session_date = s.date
  WHERE s.user_id = v_user_id;

  -- Repertoire: 1-3 pieces per day from the 7-piece list.
  INSERT INTO public.repertoire (session_id, title)
  SELECT s.id, r.title
  FROM public.sessions s
  JOIN (
    VALUES
      ('2026-09-01'::date, 'Bach Sonata No. 1'), ('2026-09-01'::date, 'Scales & Arpeggios'),
      ('2026-09-02'::date, 'Bach Sonata No. 1'),
      ('2026-09-03'::date, 'Bach Sonata No. 1'), ('2026-09-03'::date, 'Sibelius Concerto'),
      ('2026-09-04'::date, 'Scales & Arpeggios'), ('2026-09-04'::date, 'Paganini Caprice 24'),
      ('2026-09-05'::date, 'Bach Sonata No. 1'), ('2026-09-05'::date, 'Sibelius Concerto'), ('2026-09-05'::date, 'Paganini Caprice 24'),
      ('2026-09-07'::date, 'Mozart Concerto No. 5'),
      ('2026-09-08'::date, 'Mozart Concerto No. 5'), ('2026-09-08'::date, 'Scales & Arpeggios'),
      ('2026-09-09'::date, 'Bruch Violin Concerto'),
      ('2026-09-10'::date, 'Bruch Violin Concerto'), ('2026-09-10'::date, 'Orchestral Excerpts'),
      ('2026-09-11'::date, 'Scales & Arpeggios'), ('2026-09-11'::date, 'Bach Sonata No. 1'),
      ('2026-09-12'::date, 'Sibelius Concerto'), ('2026-09-12'::date, 'Paganini Caprice 24'),
      ('2026-09-14'::date, 'Mozart Concerto No. 5'),
      ('2026-09-15'::date, 'Orchestral Excerpts'), ('2026-09-15'::date, 'Scales & Arpeggios'),
      ('2026-09-16'::date, 'Bach Sonata No. 1'), ('2026-09-16'::date, 'Bruch Violin Concerto'), ('2026-09-16'::date, 'Scales & Arpeggios'),
      ('2026-09-17'::date, 'Paganini Caprice 24'),
      ('2026-09-18'::date, 'Sibelius Concerto'), ('2026-09-18'::date, 'Mozart Concerto No. 5'),
      ('2026-09-19'::date, 'Scales & Arpeggios'), ('2026-09-19'::date, 'Orchestral Excerpts'),
      ('2026-09-21'::date, 'Bach Sonata No. 1'),
      ('2026-09-22'::date, 'Bruch Violin Concerto'),
      ('2026-09-23'::date, 'Sibelius Concerto'), ('2026-09-23'::date, 'Paganini Caprice 24'),
      ('2026-09-24'::date, 'Scales & Arpeggios'), ('2026-09-24'::date, 'Mozart Concerto No. 5'),
      ('2026-09-25'::date, 'Orchestral Excerpts'), ('2026-09-25'::date, 'Bruch Violin Concerto'),
      ('2026-09-26'::date, 'Paganini Caprice 24'), ('2026-09-26'::date, 'Sibelius Concerto'), ('2026-09-26'::date, 'Orchestral Excerpts'),
      ('2026-09-28'::date, 'Bach Sonata No. 1'), ('2026-09-28'::date, 'Scales & Arpeggios'),
      ('2026-09-29'::date, 'Mozart Concerto No. 5'),
      ('2026-09-30'::date, 'Bruch Violin Concerto'),
      ('2026-10-01'::date, 'Sibelius Concerto'), ('2026-10-01'::date, 'Paganini Caprice 24'),
      ('2026-10-02'::date, 'Scales & Arpeggios'), ('2026-10-02'::date, 'Orchestral Excerpts'),
      ('2026-10-03'::date, 'Bach Sonata No. 1'), ('2026-10-03'::date, 'Bruch Violin Concerto'),
      ('2026-10-05'::date, 'Sibelius Concerto'), ('2026-10-05'::date, 'Paganini Caprice 24'), ('2026-10-05'::date, 'Mozart Concerto No. 5'),
      ('2026-10-06'::date, 'Orchestral Excerpts'), ('2026-10-06'::date, 'Scales & Arpeggios'),
      ('2026-10-07'::date, 'Bach Sonata No. 1'), ('2026-10-07'::date, 'Bruch Violin Concerto')
  ) AS r(session_date, title) ON r.session_date = s.date
  WHERE s.user_id = v_user_id;

  RAISE NOTICE 'Seeded % practice days for practicetracker.help+demo@gmail.com', 32;
END $$;
