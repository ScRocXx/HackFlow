# What's Done — Creative UI Manifesto & Gen Z Builder Overhaul

> **Vibe Check:** We killed the boilerplate corporate SaaS admin layout. No more endless walls of identical gray rectangles, no 240px sidebar squishing the workspace, and zero corporate buzzwords. HackFlow is now a tactile, spatial **"Hacker Workbench & Flight Deck"** built for real student hackers and high-velocity sprint builders.

---

## 1. Spatial Layout & Architecture Shifts

### Shift 1: The Floating Command Island Dock (`DashboardShell.tsx`)
- **Goodbye Left Sidebar:** Nuked the fixed 240px left sidebar that ate 20% of the screen. The warm architectural drafting canvas (`#F2F2EB` / `.bg-workbench-canvas`) now breathes across 100% of the viewport.
- **Floating Island Dock (Desktop & Tablet):** A sleek, dark-ink pill dock (`#10201D`) hovering top-center with brand emblem, magnetic segmented navigation pills (`Hackathons`, `Vault`, `Squads`, `Wins`) with active coral indicator pills, a tactile keycap `[+ Add]` button, notification bell, and user profile drawer.
- **Mobile Thumb Dock (<768px):** Fixed bottom thumb island dock (`bottom-4 inset-x-3`) featuring 5 quick slots (`Home`, `Vault`, raised center `+` button, `Squads`, `Wins`) with backdrop blur.

### Shift 2: 14-Day Deadline Radar + Workbench Arena (`DashboardContent.tsx`)
- **14-Day Deadline Radar:** Horizontal time-horizon dial (`NOW` → `24H` → `3D` → `7D` → `+14 DAYS`) plotting active hackathons at their exact proportional distances from now. Critical deadlines (<24h) pulse in coral, upcoming ones (<3d) glow in gold. Hovering or tapping shows a floating preview chip.
- **Hero War-Room Workbench Card (Left Column):** Gives the #1 most urgent live sprint maximum visual weight. Features:
  - Recessed OLED countdown bay (`.oled-timer-Well`)
  - **Inline checkable sprint tasks directly on the home screen** — check off tasks with optimistic micro-interactions without even navigating to the event page!
  - Tactile `[ Enter War Room → ]` launch keycap.
- **Upcoming Flight Board Queue (Right Column):** Airport departure sequencer strips displaying countdown badges, stage names, task progress, and quick-open buttons.
- **Past Cutoff Collapsible Drawer:** Expired/unsubmitted events are neatly tucked into an accordion drawer at the bottom so they never clutter active sprints.

### Shift 3: Cockpit Switchboard & Tabbed Pocket Brief
- **3-Switch Cockpit Launchpad (`SubmissionReadiness.tsx`):**
  - Replaced long yellow warning paragraphs with **3 horizontal cockpit toggle bays**: `01 GITHUB REPO`, `02 LIVE DEMO`, and `03 PITCH DECK`.
  - Realistic hardware toggle switch graphic and recessed LED status lights (🔴 Private/Error, 🟡 Unlinked, 🟢 Armed & Public).
  - Tapping any switch expands a 1-line inline URL slot with an instant `[Arm ✓]` keycap button.
  - When all 3 switches are armed green, the board illuminates: `🚀 ALL SYSTEMS GO — READY TO SHIP`.
- **Tabbed Pocket Brief (`EventDetailContent.tsx`):**
  - Replaced the stacked multi-card brief with a compact 3-tab index card: `[ 🎯 What to Build ]`, `[ ⚡ Tech Stack ]`, and `[ 📋 Judging & Rules ]`.
  - Keeps the entire Brief within ~110px height, pulling the round tasks checklist immediately into the first viewport without scrolling.
- **Animated SVG Circuit Trace (`StageTimeline.tsx`):**
  - Multi-round track connected by an animated SVG circuit trace (`.animate-circuit-trace`) that visually pumps energy from completed rounds into the active round.

### Shift 4: Lanyard ID Passes & Classified Key Cassette
- **Physical Lanyard ID Badges (`VaultProfiles.tsx`):**
  - Styled teammate cards like vertical hackathon VIP lanyard passes (`.lanyard-card`) with a realistic punch-out slot (`.lanyard-slot`) and squad header.
  - Replaced clunky form boxes with **Tactile Pill Keys** (`[ 📋 🎓 Roll ]`, `[ 📋 📞 Phone ]`, `[ 📋 ✉️ Email ]`, `[ 📋 🐙 GitHub ]`).
  - 1-tap copy with spring bounce (`.animate-pill-copy`), mint ripple flash, and morphed label (`✓ Copied [Field]!`).
  - Empty teammates render as a clean **"Blank Pass"** with a single `[🔔 Nudge Teammate]` button — zero empty `"Not set"` boxes.
- **Hardware Keyring Terminal (`SquadScratchpad.tsx`):**
  - Styled shared `.env.local` keys as a dark-mode hardware terminal (`bg-[#10201D] text-[#93C9B8]`) with a frosted privacy shutter: `🔒 Keys masked for stream safety • Click to peek`.
  - 1-click `[ 📋 Copy .env.local ]` button.

---

## 2. Heavenly CSS Physics & Motion Engine (`globals.css`)
- `--spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)` and `--spring-smooth: cubic-bezier(0.22, 1, 0.36, 1)`.
- `.bg-workbench-canvas`: Drafting mat radial dots background with warm `#F2F2EB`.
- `.keycap-btn`: Mechanical 3D keycaps with physical travel on click and hover.
- `.lanyard-card`: Physical VIP pass with foil sheen and slight rotational tilt on hover.
- `.lanyard-slot`: Authentic lanyard punch-out hole.
- `.oled-timer-Well`: Deep recessed split-flap / OLED countdown bay.
- `.animate-circuit-trace`: Animated SVG power flow line.
- `.animate-pill-copy`: Spring pop on clipboard copy.

---

## 3. Pure Gen Z Human Builder Tone Sweep
- Replaced all corporate jargon with sharp, witty, direct developer vernacular:
  - "Mission Control" / "Command Deck" → **"The Workbench"**
  - "Ingest PDF Brochure" → **"Upload Rulebook PDF"**
  - "Submission Readiness Score" → **"Launchpad Check (Armed)"**
  - "Concluded Sprints" → **"Past Runs & Wins (We cooked)"**
  - "Actionable Submission Cutoff" → **"Due in" / "Cutoff"**
  - "Pre-Flight Status" → **"🚀 All Systems Go — Ready to Ship"**

---

## 4. Verification & Clean Build Status
- **TypeScript (`npx tsc --noEmit`):** Passed with 0 errors.
- **Production Build (`npm run build`):** Passed with 0 errors across all 13 static and dynamic routes.
