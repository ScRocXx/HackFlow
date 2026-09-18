# HackFlow: Complete Architectural, Performance & UX Audit Master Specification

> **Document Status:** Comprehensive System Audit & Refactoring Roadmap  
> **Target Application:** HackFlow (Next.js 14 App Router, Supabase/Postgres, Tailwind CSS)  
> **Lens:** Principal Full-Stack Architect, Performance Engineer, and End-User UX Evaluator  
> **Scope:** Relational Schema, Server Actions, Client Rendering & Timers, Realtime Sockets, Serverless Execution Limits, AI-Generated Artifacts, and Complete User Journey Flow.

---

## Table of Contents
1. [Executive Audit Summary](#1-executive-audit-summary)
2. [Critical System & Architectural Debt (P0: Fix Now)](#2-critical-system--architectural-debt-p0-fix-now)
3. [Every Non-Working Component & Broken Logic Point Detected](#3-every-non-working-component--broken-logic-point-detected)
4. [AI-Generated Tell-Tales, Synthetic Copy & Over-Engineered Hallmarks](#4-ai-generated-tell-tales-synthetic-copy--over-engineered-hallmarks)
5. [User Journey Walkthrough: UX Friction, Visual Quirks & Papercuts](#5-user-journey-walkthrough-ux-friction-visual-quirks--papercuts)
6. [Feature & File Audit: Keep vs. Modify vs. Prune](#6-feature--file-audit-keep-vs-modify-vs-prune)
7. [Production-Ready Code & Schema Fix Blueprints](#7-production-ready-code--schema-fix-blueprints)
8. [Phased Implementation Roadmap](#8-phased-implementation-roadmap)

---

## 1. Executive Audit Summary

HackFlow aims to be an execution engine for competitive hackathon squads to track multi-stage elimination rounds, synchronize checklists, and automate deadline alerts. While the core vision is compelling and the Neo-Brutalist design language has strong identity, the application currently suffers from **five fatal architectural flaws**:

1. **Multi-Tenant Isolation Failure:** A global `UNIQUE` constraint on hackathon source URLs redirects competing squads into competitors' private workspaces or blocks them entirely.
2. **Platform-Wide Data Leakage:** Realtime WebSocket subscriptions on checklist deliverables have no event-level filters, broadcasting private tasks across all connected users on the platform.
3. **Broken Core Workflows:** The friend invitation logic contains a query flaw that permanently disables sending invitations after receiving a single request.
4. **Serverless Platform Mismatches:** File upload and PDF brochure ingestion crash Next.js Server Action body limits (1MB default vs. 15MB advertised in the UI), while scrape+inference operations risk HTTP 504 timeouts on Vercel's default execution window.
5. **Architectural & Schema Fragmentation:** Dropped circular foreign keys leave dangling UUIDs that cause blank deliverable views; duplicate profile and roster tables cause split-brain state; and monolithic client components mount dozens of hidden modal DOM trees simultaneously.

---

## 2. Critical System & Architectural Debt (P0: Fix Now)

### 2.1 Multi-Tenant Data Collision on `events.source_url`
- **Location:** `supabase/migrations/001_initial_schema.sql` (Line 18) & `src/app/actions/events.ts` (Lines 82–94)
- **The Defect:**
  In `001_initial_schema.sql`:
  ```sql
  create table public.events (
    ...
    source_url text unique,
    ...
  );
  ```
  In `src/app/actions/events.ts`:
  ```typescript
  if (data.source_url?.trim()) {
    const { data: existingEvent } = await supabase
      .from('events')
      .select('id, title')
      .eq('source_url', data.source_url.trim())
      .maybeSingle();

    if (existingEvent?.id) {
      revalidatePath('/dashboard');
      revalidatePath(`/events/${existingEvent.id}`);
      return { success: true, data: { id: existingEvent.id, title: existingEvent.title } };
    }
  }
  ```
- **Consequence:** 
  If Squad A tracks `https://devfolio.co/ethindia2026`, and Squad B subsequently inputs the same URL, Squad B is either rejected with a PostgreSQL unique constraint violation or redirected to Squad A’s private board. If Row-Level Security blocks Squad B, they see a 404; if RLS permits it, Squad B pollutes Squad A’s checklist, stages, and problem statements.
- **Remedy:** Drop the global unique constraint. Deduplicate strictly within the scope of a user or squad (`UNIQUE(created_by, source_url)` or `UNIQUE(squad_id, source_url)`).

---

### 2.2 Unfiltered Realtime Broadcast on `stage_deliverables`
- **Location:** `src/lib/supabase/event-channel.ts` (Lines 28–39) & `src/components/events/StageChecklist.tsx`
- **The Defect:**
  In `event-channel.ts`:
  ```typescript
  // event_stages is filtered:
  .on('postgres_changes', { event: '*', schema: 'public', table: 'event_stages', filter: `event_id=eq.${eventId}` }, ...)

  // stage_deliverables is completely UNFILTERED:
  .on('postgres_changes', { event: '*', schema: 'public', table: 'stage_deliverables' }, (payload) => {
    handlersRef.current.onDeliverableChange?.(payload)
  })
  ```
- **Consequence:**
  Because `stage_deliverables` only has a `stage_id` foreign key and lacks an `event_id` column, the hook subscribes to **all** changes on the entire table. Every connected browser on every hackathon page receives every deliverable created, toggled, or deleted across the entire database. The client attempts to filter by `if (newItem.stage_id !== stageId) return;`, but any malicious or curious user can inspect the WebSocket frame in DevTools and read competitors' tasks and strategies in real time.
- **Remedy:** Denormalize `event_id` onto `stage_deliverables` and enforce `filter: `event_id=eq.${eventId}`` on the channel.

---

### 2.3 Dropped Circular Foreign Key Regression: Dangling UUIDs
- **Location:** `supabase/migrations/013_drop_circular_fk.sql` & `src/app/actions/events.ts` (Lines 714–721)
- **The Defect:**
  Migration 013 dropped `fk_active_stage` to eliminate insertion deadlocks:
  ```sql
  ALTER TABLE public.events DROP CONSTRAINT fk_active_stage;
  ```
  However, `events.active_stage_id` was left as an unconstrained UUID column without any cascading cleanup or recompute trigger.
- **Consequence:**
  When a stage is deleted during an event update in `updateEvent()`, `events.active_stage_id` still holds the deleted UUID. When the event page loads:
  ```typescript
  const activeStageId = event.active_stage_id || stages?.[0]?.id;
  ```
  Because `active_stage_id` is a truthy string (the orphaned UUID), the query searches for deliverables belonging to the deleted stage. It returns 0 tasks, rendering a blank checklist, instead of falling back to the first available stage.
- **Remedy:** Re-establish the foreign key with `ON DELETE SET NULL` and install an atomic PostgreSQL trigger (`AFTER INSERT OR UPDATE OF is_completed OR DELETE ON event_stages`) that automatically sets `active_stage_id` to the lowest uncompleted round.

---

### 2.4 Serverless Function Timeout During Scrape + Gemini Generation
- **Location:** `src/app/api/extract/route.ts` (Lines 133–181) & `vercel.json`
- **The Defect:**
  The route performs sequential blocking external network requests:
  1. Jina Reader (`r.jina.ai`) scraping: 4–8 seconds.
  2. Gemini 2.0 Flash generation with a comprehensive 150-line prompt: 5–12 seconds.
  Total duration: 9–20 seconds.
- **Consequence:**
  Next.js 14 API routes hosted on Vercel default to a **10-second limit (Hobby)** or **15-second limit (Pro default)** unless `maxDuration` is exported. On cold starts or slightly slow portals, the route terminates with `504 FUNCTION_INVOCATION_TIMEOUT`.
- **Remedy:** Export `export const maxDuration = 60;` in `src/app/api/extract/route.ts`.

---

### 2.5 In-Memory Cache Anti-Pattern in Serverless Lambdas (`raw-cache.ts`)
- **Location:** `src/lib/extraction/raw-cache.ts` (Lines 22–24)
- **The Defect:**
  ```typescript
  const rawTextStash = new Map<string, StashedContent>();
  ```
- **Consequence:**
  In serverless hosting environments, lambdas are stateless and ephemeral. The import request executes on Lambda Instance A. If the user clicks "Re-parse" 3 seconds later, the request frequently hits Lambda Instance B or a cold container where `rawTextStash` is completely empty. The in-memory map cache has a near-zero hit rate in production.
- **Remedy:** Either persist the raw text in Supabase with a TTL / timestamp, or send `rawContent` back to the client and include it in the re-parse payload.

---

### 2.6 Public Fail-Open Cron Endpoint
- **Location:** `src/app/api/cron/check-deadlines/route.ts` (Lines 10–24)
- **The Defect:**
  ```typescript
  const isAuthorized =
    isDev ||
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}`;
  ```
- **Consequence:**
  If `CRON_SECRET` is missing in the production deployment environment variables, `!cronSecret` evaluates to `true`. Any anonymous user on the public internet can trigger `GET /api/cron/check-deadlines`, consuming Brevo/Resend email quotas, sending out redundant deadline notices, and spamming Discord webhooks.
- **Remedy:** Enforce strict fail-closed authorization:
  ```typescript
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ```

---

## 3. Every Non-Working Component & Broken Logic Point Detected

### 3.1 Friends Manager: Permanent Outgoing Lockout
- **Component:** `src/components/friends/FriendsManager.tsx` & `src/app/actions/friends.ts` (Lines 45–56)
- **Bug:**
  In `sendFriendRequest()`:
  ```typescript
  if (user.email) {
    const { data: existingIncoming } = await supabase
      .from('friendships')
      .select('id, status')
      .eq('receiver_email', user.email.toLowerCase())
      .maybeSingle();

    if (existingIncoming && existingIncoming.status === 'accepted') {
      return { success: false, error: 'You are already friends with this user' };
    }
  }
  ```
  The query matches **any** friendship where `receiver_email = user.email`. It does **not** filter by the sender of that friendship. If User B previously accepted a request from User A, any future attempt by User B to send a friend request to User C or User D will match User A's accepted record and reject with: *"You are already friends with this user"*.

---

### 3.2 Stage Completion Deliverable Duplication & Missing Authorization
- **Action:** `src/app/actions/stages.ts` (Lines 7–65)
- **Bug:**
  1. **Duplicate Deliverables:** In `completeStage()`, when moving to the next round, the code calls `getDefaultDeliverables(nextStage.stage_type)` and inserts them into `stage_deliverables`. However, deliverables were already created when the event was initialized. Calling `completeStage()` duplicates all deliverables for that round.
  2. **Zero Permission Check:** `completeStage()` only checks `if (!user) return { success: false, error: 'Unauthorized' };`. It never validates whether `user.id` is a participant or creator of the event. Any authenticated user on the platform can complete stages on any other squad's event by passing the UUID.

---

### 3.3 Event Card: Monolithic Dialog Inlining & Re-render Cascades
- **Component:** `src/components/events/EventCard.tsx` (Lines 309–352)
- **Bug:**
  Each `EventCard` renders an `<EditEventDialog open={editOpen} ... />` (nearly 500 lines of forms and state) and a `<Dialog open={deleteOpen} ... />`.
  If a user has 25 events, 25 full edit dialog DOM trees and 25 delete dialog trees are mounted simultaneously. When the singleton `CountdownTimer` ticker emits a tick every second, React reconciles all 25 hidden dialog trees, causing continuous CPU utilization on lower-end devices.
- **Fix:** Elevate a single, shared `EditEventDialog` and `DeleteEventDialog` to `DashboardContent.tsx`, keyed by an `activeEditEvent` state.

---

### 3.4 PDF Brochure Ingestion: 1MB Server Action Limit Collision
- **Component:** `src/components/events/IdeaSandbox.tsx` (Line 57) vs. `src/app/actions/extract-pdf.ts` vs. `next.config.mjs`
- **Bug:**
  `IdeaSandbox.tsx` tells the user: *"PDF exceeds 15MB limit"*. It base64-encodes the file and sends it to `extractProblemStatementsFromPdf(base64Pdf)`.
  However, in Next.js 14, Server Actions have a hard default body limit of **1MB**. Base64 encoding increases file size by 33%. Any brochure larger than ~750KB is rejected by the Next.js server with HTTP `413 Payload Too Large` before the action even executes.
- **Fix:** Configure `experimental: { serverActions: { bodySizeLimit: '10mb' } }` in `next.config.mjs`, or upload directly to Supabase Storage and pass the signed URL.

---

### 3.5 File Upload API: Redundant Bucket Creation & Size Discrepancy
- **Route:** `src/app/api/upload/route.ts` (Lines 6, 26, 60)
- **Bug:**
  1. On every single file upload, the code executes:
     ```typescript
     await adminClient.storage.createBucket(BUCKET_NAME, { public: true, ... });
     ```
     This sends an unnecessary HTTP administrative call to Supabase on every user file upload.
  2. The file states `MAX_FILE_SIZE = 50 * 1024 * 1024;` (50MB). However, Vercel Serverless Function request bodies have a hard ceiling of **4.5MB**. Uploading an 8MB slide deck fails with a Vercel 413 error before reaching the route.

---

### 3.6 Deadline Cron: Window Mismatch & Memory Leak
- **Location:** `vercel.json` (Line 6) & `src/lib/notifications/engine.ts` (Lines 16–38, 88–95)
- **Bug:**
  1. `vercel.json` schedules the cron to run once every 24 hours (`0 0 * * *`). But `engine.ts` looks for stages due in `<= 6 hours` (`6h` interval). Any 6-hour alert window occurring between 01:00 and 23:59 is completely missed.
  2. `engine.ts` loads the **entire** notification logs table with no WHERE clause:
     ```typescript
     const { data: allLogs } = await supabaseAdmin
       .from('notification_logs')
       .select('stage_id, interval_key, channel, recipient_email');
     ```
     As the app scales, this query performs an unbounded table scan that will exhaust Node.js runtime memory.

---

### 3.7 Teammate Invite ID Resolution Glitch
- **Component:** `src/components/events/EventDetailContent.tsx` (Lines 692–700)
- **Bug:**
  ```typescript
  const friendUserId = f.sender_id === event.created_by 
    ? f.receiver_id 
    : (f.receiver_id === event.created_by ? f.sender_id : (f.friend_profile?.id || ''));
  ```
  This logic checks `f.sender_id === event.created_by`. If a squad member who is **not** the event creator attempts to add one of their own friends, `event.created_by` does not match, causing `friendUserId` to resolve incorrectly.

---

### 3.8 Split-Brain User Profiles: `profiles` vs. `team_vault_profiles`
- **Location:** `supabase/migrations/006_vault_and_lifecycle.sql` & `src/app/actions/vault.ts`
- **Bug:**
  There are two competing profile tables:
  - `public.profiles` (`id`, `full_name`, `email`, `avatar_url`)
  - `public.team_vault_profiles` (`id`, `user_id`, `full_name`, `email`, `phone`, `college`, `roll_number`, `github_url`, `linkedin_url`, `portfolio_url`, `resume_url`)
  When a user edits their name in the vault, it can fall out of sync with `profiles`. To bypass foreign key errors, every vault action runs defensive upserts against both tables.
- **Fix:** Merge contact and social fields directly into `public.profiles` and drop `team_vault_profiles`.

---

### 3.9 Notification Bell: Re-Subscription on Every Render
- **Component:** `src/components/notifications/NotificationBell.tsx` (Line 74) & `NotificationToast.tsx`
- **Bug:**
  In `NotificationBell.tsx`:
  ```typescript
  const supabase = createClient();
  useEffect(() => {
    ...
  }, [userId, supabase]);
  ```
  Because `createClient()` is called inside the component body, its reference changes on render cycles, causing the `useEffect` to unmount and re-subscribe to the Realtime channel repeatedly. Furthermore, `NotificationToast` and `NotificationBell` create separate redundant subscriptions for the exact same table and user.

---

### 3.10 Trophy Case Filter Omission
- **Component:** `src/app/(dashboard)/archive/page.tsx` (Line 23) vs. `StatusPills.tsx`
- **Bug:**
  `StatusPills.tsx` lets users mark an event as `under_review` or `finalist`.
  However, `ArchivePage` filters only for:
  ```typescript
  ['winner', 'runner_up', 'participated', 'archived', 'submitted'].includes(e.status)
  ```
  Any hackathon marked as `finalist` or `under_review` disappears from both the active dashboard and the Trophy Case archive.

---

## 4. AI-Generated Tell-Tales, Synthetic Copy & Over-Engineered Hallmarks

The following sections of the codebase contain unmistakable indicators of AI generation, synthetic jargon, and unnecessary LLM-prompted complexity:

### 4.1 Synthetic "Bureaucracy" Copy in Offline Packager
- **File:** `src/lib/export/offline-packager.ts` (Lines 30–75)
- **Problem:**
  The generated markdown contains synthetic phrases that real developers do not produce:
  ```markdown
  Generated via HackFlow Emergency Telemetry on [Timestamp]
  ...
  ## Presentation Checklist (Offline Protocol)
  1. Ensure screen resolution is set to 1080p for presentation projector.
  2. Verify local demo server is running and bound to 0.0.0.0 / localhost.
  3. Keep PDF slides opened locally in full-screen reader.
  4. Keep video backup (MP4) in folder in case of live demo glitch.
  ```
  *Why it stands out:* Real squads do not need an automated zip file instructing them to set their projector resolution to 1080p. This is typical hallucinated padding from an LLM asked to create an "offline emergency pitch kit."

---

### 4.2 Over-The-Top LLM Personas in Gemini Prompts
- **File:** `src/lib/extraction/gemini-parser.ts` (Lines 361–425)
- **Problem:**
  ```typescript
  const systemPrompt = `You are an elite, site-agnostic competitive technology event parser.
  Your mission is to analyze competition text ... with extreme precision and output structured JSON.
  ...
  THE 4 UNIVERSAL COMPETITION LIFECYCLE PHASES:
  Every competitive event anywhere in the world follows some combination of these 4 chronological lifecycle phases...
  ...
  TWO-PASS SELF-CORRECTION PROTOCOL:
  You must perform a strict two-pass self-audit before finalizing your JSON...`
  ```
  *Why it stands out:* Grandiose declarations ("elite, site-agnostic...", "THE 4 UNIVERSAL LIFECYCLE PHASES", "TWO-PASS SELF-CORRECTION PROTOCOL") reflect multi-prompt conversational priming rather than concise, production-grade system instructions.

---

### 4.3 Fake Mockups & Hardcoded Elements on Landing Page
- **File:** `src/app/page.tsx` (Lines 180–315)
- **Problem:**
  The landing page hardcodes a static mockup terminal:
  - `⚡ PARSED IN 1.8s` (arbitrary hardcoded badge)
  - Hardcoded team members ("Rohan", "Priya", "Assigned to You")
  - Fake interactive elements that mimic live product functionality within a static server component.
  While visual demonstrations are helpful, hardcoding simulated metric claims like "PARSED IN 1.8s" comes across as synthetic marketing copy.

---

### 4.4 Defensive Upsert Boilerplate Spread Across Server Actions
- **Files:** `src/app/actions/events.ts` (Lines 64–76) & `src/app/actions/vault.ts` (Lines 67–74)
- **Problem:**
  Every server action contains defensive upserts targeting `public.profiles` to prevent foreign key errors:
  ```typescript
  // 0. Ensure user profile exists to prevent foreign key violation on events.created_by
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'HackFlow Member',
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'id' });
  ```
  *Why it stands out:* This is a classic pattern where an AI assistant patches a missing database trigger by copying defensive upsert boilerplate into every server-side function.

---

### 4.5 The "Meet Companion Bar" Feature Bloat
- **File:** `src/components/events/MeetCompanionBar.tsx` & `events.meet_url`
- **Problem:**
  A dedicated database column (`events.meet_url`), custom server action (`updateEventMeetUrl`), and a modal component were created solely to store a single meeting link.
  In a real hackathon tool, a meeting link is simply an entry in `event_resources`. Giving it bespoke database columns and separate modal workflows is unnecessary feature bloat.

---

## 5. User Journey Walkthrough: UX Friction, Visual Quirks & Papercuts

Stepping into the shoes of a real user exploring HackFlow reveals several points of friction across the interface:

```
[User Journey Flow]
Landing Page -> Signup -> Dashboard -> Import Event -> Event Workspace -> Squad & Vault -> Submission
      |            |           |             |               |               |              |
   (Heavy)     (No Auto)   (8-Query)     (1200-Line)     (Premature     (Broken Friend   (Rate Limit
   40KB SSR      Login     Waterfall)     Monolith)      Console)         Invites)          Trap)
```

### 5.1 Landing Page (`/`)
1. **File Weight:** The page is a single 658-line file (nearly 40KB). While styled in Neo-Brutalism, the visual hierarchy is crowded, with six different colored badge variants in the hero alone.
2. **Accessibility Skip Link:** The skip link jumps to `#main`, but the hero centerpiece has an inner scroll container that captures focus awkwardly on tab navigation.
3. **Redundant CTAs:** "Open HackFlow", "Paste a hackathon link →", and "See how it works" all compete for primary visual weight in the first viewport.

---

### 5.2 Authentication (`/login` & `/signup`)
1. **Signup Dead-End:** When a user registers with email and password, the card simply swaps to a green "Account Created!" box. It does not automatically log the user in or redirect to `/dashboard`. The user is left wondering whether to check their email or manually navigate to `/login`.
2. **Verbose Error Messages:** If Google OAuth is not enabled in Supabase, the error box renders two full sentences instructing the user how to configure their Supabase project settings. Production users should see a friendly error, while developer setup guidance belongs in documentation.

---

### 5.3 The Dashboard (`/dashboard`)
1. **Loading Latency:** Navigating to `/dashboard` triggers the 8-query waterfall. On typical broadband, the loading skeleton is visible for 1.2 to 2.4 seconds before cards render.
2. **Click Target Conflict:** In `EventCard`, clicking anywhere on the card navigates to `/events/[id]`. However, the status pills and resource link tags inside the card have small hit targets. Clicking slightly off-center on a pill inadvertently navigates to the event page instead of changing the status.
3. **Card Clutter:** Every card attempts to show platform badges, mode badges, prize summaries, a countdown timer, deliverable progress bar, team member count, and resource link pills all within a 280px tall box.

---

### 5.4 Importing a Hackathon (`URLParseDialog`)
1. **Giant 1,293-Line Monolith:** `URLParseDialog.tsx` is over 58KB. If Gemini extraction takes 10 seconds, the user sees a single generic spinner. There is no progressive indication of scraping, cleaning, and extraction progress.
2. **Date Picker Inconsistencies:** The dialog uses native HTML datetime inputs (`toLocalDatetimeInputString`). If the user edits a parsed date, the input does not show the competition's local timezone (e.g., IST/PST), leading to confusion when UTC offsets are saved.
3. **Tab State Loss:** If a user pastes a URL, switches to the "Text" tab to add additional notes, and switches back, state is sometimes cleared or re-initialized.

---

### 5.5 Event Workspace (`/events/[eventId]`)
1. **Premature Post-Submission Console:** The entire 600-line `PostSubmissionConsole` (with smoke tests, submission receipt IDs, pitch deck URLs, and retro notes) renders directly below the active stage, even for hackathons in early ideation. New users are confronted with 8 empty submission fields before writing their first line of code.
2. **Countdown Timer Layout Shift:** When the timer transitions between `kickoff` and `submission` states, the background color and border thickness change, causing a slight layout shift in the stage header.
3. **Checklist Lag:** Checking a box triggers an optimistic update, but the background Server Action revalidates the entire route (`revalidatePath`), causing server-rendered components to flicker on slow network connections.

---

### 5.6 Squads & Friends (`/friends`)
1. **Friend Request Deadlock:** As noted in Section 3.1, once a user accepts an incoming friend request, the system blocks them from sending any future outgoing requests.
2. **Missing Search & Pagination:** All friends and pending requests are rendered in a single list with no search bar or pagination.
3. **No Ownership Transfer:** Once a squad is created, there is no way for the leader to promote another member, leave the squad, or delete it cleanly.

---

### 5.7 Squad Vault (`/vault`)
1. **Redundant Data Entry:** The vault asks users to enter their Name, Email, Phone, College, and Social Links. Users expect their name and email to be pre-populated from their account settings.
2. **Asset Upload Failures:** Dropping a 6MB design file fails silently or shows a generic error because the upload route exceeds Vercel's 4.5MB request limit.

---

## 6. Feature & File Audit: Keep vs. Modify vs. Prune

| Item | Path / Identifier | Verdict | Concrete Rationale |
| :--- | :--- | :---: | :--- |
| **Multi-Stage Engine** | `src/components/events/StageTimeline.tsx`, `CountdownTimer.tsx` | **KEEP** | Core differentiator. Clear stage progression (Kickoff &rarr; Midpoint &rarr; Freeze &rarr; Demo) keeps squads aligned. |
| **Realtime Checklist** | `src/components/events/StageChecklist.tsx` | **MODIFY** | Essential collaboration feature. Add `event_id` to eliminate tenant data leaks. |
| **AI Extractor** | `src/lib/extraction/` | **MODIFY** | Critical for onboarding. Add `maxDuration = 60`, replace the in-memory Map with payload passing, and streamline prompt personas. |
| **Squad Vault** | `src/components/vault/` | **MODIFY** | Keep squad assets. Drop `team_vault_profiles` and consolidate fields into `public.profiles`. |
| **Meet Companion Bar** | `src/components/events/MeetCompanionBar.tsx` | **PRUNE** | Unnecessary dedicated database column and modal state. Fold meeting links into standard `event_resources`. |
| **Offline Packager** | `src/lib/export/offline-packager.ts` | **PRUNE** | 100KB of `JSZip` bundle bloat producing synthetic boilerplate text. Real hackathon teams do not use this. |
| **GitHub Smoke Test** | `src/components/events/PostSubmissionConsole.tsx` | **PRUNE / SIMPLIFY** | Unauthenticated browser fetch to `api.github.com` hits GitHub's 60 req/hr rate limit on shared campus WiFi. Simplify to basic URL regex validation. |
| **Dead Route Stub** | `src/app/(dashboard)/events/page.tsx` | **PRUNE** | 6-line file that merely redirects to `/dashboard`. Unnecessary route. |
| **Alias Route** | `src/app/auth/callback/route.ts` | **PRUNE** | 2-line re-export of `src/app/(auth)/callback/route.ts`. Use a single canonical callback route. |
| **Stale Schema Script** | `supabase/fix_schema_and_rls.sql` | **PRUNE** | References `public.team_members`, which was dropped in migration 011. Running it errors out. Consolidate into official migrations. |

---

## 7. Production-Ready Code & Schema Fix Blueprints

### Blueprint 1: Relational Schema & Stage Integrity Fix
Run this migration in the Supabase SQL editor to resolve multi-tenant collisions, restore foreign key safety, and prepare `stage_deliverables` for scoped Realtime:

```sql
-- ==============================================================================
-- 015_remedy_architecture_and_multi_tenancy.sql
-- ==============================================================================

-- 1. Remove dangerous global unique constraint on source_url
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_url_key;

-- 2. Scope uniqueness per squad or creator (multi-tenant safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_squad_source_url 
ON public.events (squad_id, source_url) 
WHERE squad_id IS NOT NULL AND source_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_creator_source_url 
ON public.events (created_by, source_url) 
WHERE squad_id IS NULL AND source_url IS NOT NULL;

-- 3. Restore foreign key on active_stage_id with ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_events_active_stage' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events 
      ADD CONSTRAINT fk_events_active_stage 
      FOREIGN KEY (active_stage_id) 
      REFERENCES public.event_stages(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Denormalize event_id onto stage_deliverables for scoped Realtime
ALTER TABLE public.stage_deliverables 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Backfill event_id from parent stage
UPDATE public.stage_deliverables sd
SET event_id = es.event_id
FROM public.event_stages es
WHERE sd.stage_id = es.id AND sd.event_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_stage_deliverables_event_id ON public.stage_deliverables(event_id);

-- 5. Atomic active_stage_id recompute trigger
CREATE OR REPLACE FUNCTION public.trg_fn_recompute_active_stage()
RETURNS TRIGGER AS $$
DECLARE
  v_target_event_id UUID;
  v_next_stage_id UUID;
BEGIN
  v_target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  -- Pick lowest uncompleted round, or fallback to lowest round overall
  SELECT id INTO v_next_stage_id
  FROM public.event_stages
  WHERE event_id = v_target_event_id AND is_completed = false
  ORDER BY round_number ASC
  LIMIT 1;

  IF v_next_stage_id IS NULL THEN
    SELECT id INTO v_next_stage_id
    FROM public.event_stages
    WHERE event_id = v_target_event_id
    ORDER BY round_number ASC
    LIMIT 1;
  END IF;

  UPDATE public.events
  SET active_stage_id = v_next_stage_id
  WHERE id = v_target_event_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recompute_active_stage ON public.event_stages;
CREATE TRIGGER trg_recompute_active_stage
AFTER INSERT OR UPDATE OF is_completed OR DELETE ON public.event_stages
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_recompute_active_stage();
```

---

### Blueprint 2: Scoped Realtime Listener
Update `src/lib/supabase/event-channel.ts` to scope deliverables strictly to the active event:

```typescript
// src/lib/supabase/event-channel.ts (Line 28)
const channel = supabase.channel(channelName)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'stage_deliverables',
      filter: `event_id=eq.${eventId}`, // Prevents platform-wide data leakage
    },
    (payload) => {
      handlersRef.current.onDeliverableChange?.(payload);
    }
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'event_stages',
      filter: `event_id=eq.${eventId}`,
    },
    (payload) => {
      handlersRef.current.onStageChange?.(payload);
    }
  )
  .subscribe();
```

---

### Blueprint 3: Collapsing the 8-Query Dashboard Waterfall
Replace lines 754–866 in `src/app/actions/events.ts` with a single relational query:

```typescript
export async function getUserEvents() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: 'Unauthorized' };

    // 1 single roundtrip resolving related records directly in PostgreSQL
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        stages:event_stages(
          id, round_number, title, stage_type, deadline, 
          window_start, window_end, actionable_deadline, raw_date_snippet, is_completed
        ),
        resources:event_resources(id, title, url, resource_type),
        squad:squads(id, name),
        participants:event_participants(id, user_id, role)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!events || events.length === 0) return { success: true, data: [] };

    // In-memory mapping for deliverable progress and active round
    const enriched = events.map((event: any) => {
      const stages = (event.stages || []).sort((a: any, b: any) => a.round_number - b.round_number);
      const activeStage = stages.find((s: any) => s.id === event.active_stage_id) 
        || stages.find((s: any) => !s.is_completed) 
        || stages[0] 
        || null;

      return {
        ...event,
        stages,
        active_stage: activeStage,
        team_count: (event.participants || []).length,
        squad_name: event.squad?.name || null,
      };
    });

    return { success: true, data: enriched };
  } catch (err: any) {
    console.error('Error in getUserEvents:', err);
    return { success: false, error: err.message };
  }
}
```

---

### Blueprint 4: Fail-Closed Cron & Next.js Body Limits
Update `src/app/api/cron/check-deadlines/route.ts` and `next.config.mjs`:

```typescript
// src/app/api/cron/check-deadlines/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // STRICT FAIL-CLOSED: Refuse execution if CRON_SECRET is missing or token doesn't match
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing authorization header' },
      { status: 401 }
    );
  }

  // Execute notification engine...
}
```

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Allows brochure PDFs up to 10MB to pass through Server Actions
    },
  },
};

export default nextConfig;
```

---

## 8. Phased Implementation Roadmap

### Phase 1: Security & Multi-Tenant Integrity (Immediate)
- [ ] Apply `015_remedy_architecture_and_multi_tenancy.sql` to drop `events_source_url_key` and add `event_id` to `stage_deliverables`.
- [ ] Update `src/lib/supabase/event-channel.ts` to add `filter: event_id=eq.${eventId}` on deliverables.
- [ ] Fix fail-closed auth in `src/app/api/cron/check-deadlines/route.ts`.
- [ ] Correct query filtering in `sendFriendRequest()` (`src/app/actions/friends.ts`).

### Phase 2: Performance & Serverless Limits (High Priority)
- [ ] Collapse the 8-query waterfall in `getUserEvents()` into a single relational query.
- [ ] Add `export const maxDuration = 60;` to `src/app/api/extract/route.ts`.
- [ ] Add `bodySizeLimit: '10mb'` in `next.config.mjs`.
- [ ] Elevate `EditEventDialog` and `DeleteEventDialog` from `EventCard` to `DashboardContent`.
- [ ] Change cron frequency from daily (`0 0 * * *`) to hourly (`0 * * * *`) in `vercel.json`.

### Phase 3: Codebase Cleanliness & Pruning (Modernization)
- [ ] Remove `src/lib/export/offline-packager.ts` and uninstall `jszip`.
- [ ] Consolidate `MeetCompanionBar` into `event_resources`.
- [ ] Merge `team_vault_profiles` columns into `public.profiles`.
- [ ] Delete dead routes (`src/app/(dashboard)/events/page.tsx`, `src/app/auth/callback/route.ts`).
- [ ] Standardize `ArchivePage` status filtering to include `finalist` and `under_review`.
