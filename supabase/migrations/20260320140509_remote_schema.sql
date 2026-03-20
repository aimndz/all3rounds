drop extension if exists "pg_net";

drop function if exists "public"."merge_speaker_ids"(old_emcee_id uuid, new_emcee_id uuid);

drop function if exists "public"."search_battles_fuzzy"(search_query text, status_filter text, year_filter text, sort_order text, page_size integer, page_offset integer);

drop index if exists "public"."idx_battles_event_name_trgm";


  create table "public"."suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "line_id" bigint not null,
    "user_id" uuid not null,
    "suggested_content" text not null,
    "original_content" text not null,
    "status" text not null default 'pending'::text,
    "reviewed_by" uuid,
    "review_note" text,
    "created_at" timestamp with time zone default now(),
    "reviewed_at" timestamp with time zone
      );


alter table "public"."suggestions" enable row level security;


  create table "public"."user_profiles" (
    "id" uuid not null,
    "role" text not null default 'viewer'::text,
    "display_name" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "trust_level" text default 'new'::text
      );


alter table "public"."user_profiles" enable row level security;


  create table "public"."video_processing_status" (
    "youtube_id" text not null,
    "status" text not null,
    "worker_id" text,
    "started_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."video_processing_status" enable row level security;

CREATE INDEX idx_suggestions_line_id ON public.suggestions USING btree (line_id);

CREATE INDEX idx_suggestions_status ON public.suggestions USING btree (status);

CREATE INDEX idx_suggestions_user_id ON public.suggestions USING btree (user_id);

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);

CREATE INDEX idx_vps_status ON public.video_processing_status USING btree (status);

CREATE UNIQUE INDEX suggestions_pkey ON public.suggestions USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX video_processing_status_pkey ON public.video_processing_status USING btree (youtube_id);

alter table "public"."suggestions" add constraint "suggestions_pkey" PRIMARY KEY using index "suggestions_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."video_processing_status" add constraint "video_processing_status_pkey" PRIMARY KEY using index "video_processing_status_pkey";

alter table "public"."suggestions" add constraint "suggestions_line_id_fkey" FOREIGN KEY (line_id) REFERENCES public.lines(id) ON DELETE CASCADE not valid;

alter table "public"."suggestions" validate constraint "suggestions_line_id_fkey";

alter table "public"."suggestions" add constraint "suggestions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL not valid;

alter table "public"."suggestions" validate constraint "suggestions_reviewed_by_fkey";

alter table "public"."suggestions" add constraint "suggestions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'flagged'::text]))) not valid;

alter table "public"."suggestions" validate constraint "suggestions_status_check";

alter table "public"."suggestions" add constraint "suggestions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."suggestions" validate constraint "suggestions_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_role_check" CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'moderator'::text, 'verified_emcee'::text, 'viewer'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_role_check";

alter table "public"."user_profiles" add constraint "user_profiles_trust_level_check" CHECK ((trust_level = ANY (ARRAY['new'::text, 'trusted'::text, 'senior'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_trust_level_check";

alter table "public"."video_processing_status" add constraint "video_processing_status_status_check" CHECK ((status = ANY (ARRAY['processing'::text, 'completed'::text, 'failed'::text]))) not valid;

alter table "public"."video_processing_status" validate constraint "video_processing_status_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_random_valid_line_id()
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT l.id
  FROM lines l
  JOIN battles b ON l.battle_id = b.id
  WHERE b.status != 'raw'
  OFFSET floor(random() * (
    SELECT count(*)
    FROM lines l2
    JOIN battles b2 ON l2.battle_id = b2.id
    WHERE b2.status != 'raw'
  ))
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'viewer'
  )
  -- This part is key: if the user exists in profiles but not in auth, 
  -- it will update instead of crashing.
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = now();
    
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_all_hybrid(search_term text)
 RETURNS TABLE(id bigint, content text, start_time double precision, end_time double precision, round_number integer, speaker_label text, emcee_id uuid, emcee_name text, speaker_ids uuid[], battle_id uuid, battle_title text, battle_youtube_id text, battle_event_name text, battle_event_date date, battle_status text, rank real)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set a 8 second timeout specifically for this function call
  PERFORM set_config('statement_timeout', '8000', true);
  
  -- Raise similarity threshold to reduce false positives and let GIN index work better
  PERFORM set_config('pg_trgm.similarity_threshold', '0.4', true);

  RETURN QUERY
  WITH matched_lines AS (
    -- 1. FTS + trigram content matching (GIN-indexed)
    SELECT l.id,
           (ts_rank_cd(l.search_vector, websearch_to_tsquery('simple', search_term)) * 10.0 +
            CASE WHEN l.content ILIKE search_term THEN 100.0 ELSE 0.0 END +
            similarity(l.content, search_term) * 1.0) AS rank_score
    FROM lines l
    WHERE l.search_vector @@ websearch_to_tsquery('simple', search_term)
       OR l.content % search_term
    LIMIT 1000
  ),
  matched_emcees AS (
    -- 2. Emcee name matching (GIN-indexed, small table)
    SELECT e.id,
           (CASE WHEN e.name ILIKE search_term THEN 200.0 ELSE 0.0 END +
            similarity(e.name, search_term) * 5.0) AS emcee_score
    FROM emcees e
    WHERE e.name % search_term OR e.name ILIKE search_term
  ),
  matched_battles AS (
    -- 3. Battle title matching (GIN-indexed, small table)
    SELECT b.id,
           (CASE WHEN b.title ILIKE search_term THEN 150.0 ELSE 0.0 END +
            similarity(b.title, search_term) * 3.0) AS battle_score
    FROM battles b
    WHERE b.title % search_term OR b.title ILIKE search_term
  ),
  combined_line_ids AS (
    -- 4. Combine all matched line IDs
    SELECT ml.id, ml.rank_score AS base_score FROM matched_lines ml
    UNION ALL
    SELECT l.id, me.emcee_score AS base_score 
    FROM lines l 
    JOIN matched_emcees me ON (l.emcee_id = me.id OR l.speaker_ids @> ARRAY[me.id])
    UNION ALL
    SELECT l.id, mb.battle_score AS base_score FROM lines l JOIN matched_battles mb ON l.battle_id = mb.id
  ),
  aggregated_lines AS (
    -- 5. Group by line ID to sum up scores
    SELECT c.id, SUM(c.base_score) as total_rank
    FROM combined_line_ids c
    GROUP BY c.id
  )
  -- 6. Fetch joined data for final results
  SELECT 
    l.id, l.content, l.start_time, l.end_time, l.round_number, l.speaker_label,
    e.id as emcee_id, e.name as emcee_name,
    l.speaker_ids,
    b.id as battle_id, b.title as battle_title, b.youtube_id, b.event_name, b.event_date, b.status::text,
    al.total_rank::FLOAT4 as rank
  FROM aggregated_lines al
  JOIN lines l ON al.id = l.id
  LEFT JOIN emcees e ON l.emcee_id = e.id
  LEFT JOIN battles b ON l.battle_id = b.id
  ORDER BY rank DESC
  LIMIT 500;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_fast(search_term text)
 RETURNS TABLE(id bigint, content text, start_time double precision, end_time double precision, round_number integer, speaker_label text, emcee_id uuid, emcee_name text, speaker_ids uuid[], battle_id uuid, battle_title text, battle_youtube_id text, battle_event_name text, battle_event_date date, battle_status text, rank real)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Hard 3s timeout: if this query is slow, kill it and free the connection
  PERFORM set_config('statement_timeout', '3000', true);

  RETURN QUERY
  WITH 
  -- 1. FTS content matching (uses GIN index, extremely fast)
  fts_lines AS (
    SELECT l.id,
           (ts_rank_cd(l.search_vector, websearch_to_tsquery('simple', search_term)) * 10.0 +
            CASE WHEN l.content ILIKE '%' || search_term || '%' THEN 100.0 ELSE 0.0 END
           ) AS rank_score
    FROM lines l
    WHERE l.search_vector @@ websearch_to_tsquery('simple', search_term)
    LIMIT 500
  ),
  -- 2. Emcee name matching (trigram is fine here, emcees table is tiny)
  matched_emcees AS (
    SELECT e.id,
           (CASE WHEN e.name ILIKE '%' || search_term || '%' THEN 200.0 ELSE 0.0 END +
            similarity(e.name, search_term) * 5.0) AS emcee_score
    FROM emcees e
    WHERE e.name % search_term OR e.name ILIKE '%' || search_term || '%'
  ),
  -- 3. Battle title matching (trigram is fine here, battles table is tiny)
  matched_battles AS (
    SELECT b.id,
           (CASE WHEN b.title ILIKE '%' || search_term || '%' THEN 150.0 ELSE 0.0 END +
            similarity(b.title, search_term) * 3.0) AS battle_score
    FROM battles b
    WHERE b.title % search_term OR b.title ILIKE '%' || search_term || '%'
  ),
  -- 4. Combine all matched line IDs
  combined AS (
    SELECT fl.id, fl.rank_score AS base_score FROM fts_lines fl
    UNION ALL
    SELECT l.id, me.emcee_score AS base_score 
    FROM lines l 
    JOIN matched_emcees me ON (l.emcee_id = me.id OR l.speaker_ids @> ARRAY[me.id])
    UNION ALL
    SELECT l.id, mb.battle_score AS base_score 
    FROM lines l 
    JOIN matched_battles mb ON l.battle_id = mb.id
  ),
  -- 5. Aggregate scores
  aggregated AS (
    SELECT c.id, SUM(c.base_score) AS total_rank
    FROM combined c
    GROUP BY c.id
  )
  -- 6. Final join for display data
  SELECT 
    l.id, l.content, l.start_time, l.end_time, l.round_number, l.speaker_label,
    e.id AS emcee_id, e.name AS emcee_name,
    l.speaker_ids,
    b.id AS battle_id, b.title AS battle_title, b.youtube_id AS battle_youtube_id, 
    b.event_name AS battle_event_name, b.event_date AS battle_event_date, 
    b.status::TEXT AS battle_status,
    a.total_rank::FLOAT4 AS rank
  FROM aggregated a
  JOIN lines l ON a.id = l.id
  LEFT JOIN emcees e ON l.emcee_id = e.id
  LEFT JOIN battles b ON l.battle_id = b.id
  ORDER BY rank DESC
  LIMIT 500;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_emcee_battle_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.emcees SET battle_count = battle_count + 1 WHERE id = NEW.emcee_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.emcees SET battle_count = battle_count - 1 WHERE id = OLD.emcee_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.emcee_id != NEW.emcee_id) THEN
            UPDATE public.emcees SET battle_count = battle_count - 1 WHERE id = OLD.emcee_id;
            UPDATE public.emcees SET battle_count = battle_count + 1 WHERE id = NEW.emcee_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$
;

grant delete on table "public"."suggestions" to "anon";

grant insert on table "public"."suggestions" to "anon";

grant references on table "public"."suggestions" to "anon";

grant select on table "public"."suggestions" to "anon";

grant trigger on table "public"."suggestions" to "anon";

grant truncate on table "public"."suggestions" to "anon";

grant update on table "public"."suggestions" to "anon";

grant delete on table "public"."suggestions" to "authenticated";

grant insert on table "public"."suggestions" to "authenticated";

grant references on table "public"."suggestions" to "authenticated";

grant select on table "public"."suggestions" to "authenticated";

grant trigger on table "public"."suggestions" to "authenticated";

grant truncate on table "public"."suggestions" to "authenticated";

grant update on table "public"."suggestions" to "authenticated";

grant delete on table "public"."suggestions" to "service_role";

grant insert on table "public"."suggestions" to "service_role";

grant references on table "public"."suggestions" to "service_role";

grant select on table "public"."suggestions" to "service_role";

grant trigger on table "public"."suggestions" to "service_role";

grant truncate on table "public"."suggestions" to "service_role";

grant update on table "public"."suggestions" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

grant delete on table "public"."video_processing_status" to "anon";

grant insert on table "public"."video_processing_status" to "anon";

grant references on table "public"."video_processing_status" to "anon";

grant select on table "public"."video_processing_status" to "anon";

grant trigger on table "public"."video_processing_status" to "anon";

grant truncate on table "public"."video_processing_status" to "anon";

grant update on table "public"."video_processing_status" to "anon";

grant delete on table "public"."video_processing_status" to "authenticated";

grant insert on table "public"."video_processing_status" to "authenticated";

grant references on table "public"."video_processing_status" to "authenticated";

grant select on table "public"."video_processing_status" to "authenticated";

grant trigger on table "public"."video_processing_status" to "authenticated";

grant truncate on table "public"."video_processing_status" to "authenticated";

grant update on table "public"."video_processing_status" to "authenticated";

grant delete on table "public"."video_processing_status" to "service_role";

grant insert on table "public"."video_processing_status" to "service_role";

grant references on table "public"."video_processing_status" to "service_role";

grant select on table "public"."video_processing_status" to "service_role";

grant trigger on table "public"."video_processing_status" to "service_role";

grant truncate on table "public"."video_processing_status" to "service_role";

grant update on table "public"."video_processing_status" to "service_role";


  create policy "Logged-in users can suggest"
  on "public"."suggestions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Reviewers can read all suggestions"
  on "public"."suggestions"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'moderator'::text]))))));



  create policy "Reviewers can update suggestions"
  on "public"."suggestions"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'moderator'::text]))))));



  create policy "Users can read own suggestions"
  on "public"."suggestions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Admins can read all profiles"
  on "public"."user_profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_profiles user_profiles_1
  WHERE ((user_profiles_1.id = auth.uid()) AND (user_profiles_1.role = ANY (ARRAY['superadmin'::text, 'admin'::text]))))));



  create policy "Superadmins can read all profiles"
  on "public"."user_profiles"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_profiles user_profiles_1
  WHERE ((user_profiles_1.id = auth.uid()) AND (user_profiles_1.role = 'superadmin'::text)))));



  create policy "Superadmins can update profiles"
  on "public"."user_profiles"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_profiles user_profiles_1
  WHERE ((user_profiles_1.id = auth.uid()) AND (user_profiles_1.role = 'superadmin'::text)))));



  create policy "Users can read own profile"
  on "public"."user_profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


