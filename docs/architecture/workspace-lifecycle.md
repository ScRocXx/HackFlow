# Workspace Lifecycle & Stage Progression

This document defines the finite state machine, scheduling calculations, and deliverable tracking model governing HackFlow event workspaces.

## 1. Stage Progression State Machine

Each hackathon event is partitioned into sequentially ordered stages (e.g., *Idea Submission*, *Prototype Build / MVP*, *Grand Finale / Pitch*).

```
[ Scheduled / Upcoming ]
          │
          ▼
    [ Active ]  ◄─── (Countdown Active, Deliverables Open)
          │
          ▼
   [ In Review ]
          │
          ▼
   [ Completed ]
```

### Active Stage Determination Heuristic
A stage is marked active when:
1. `event.active_stage_id === stage.id`, OR
2. The stage is uncompleted (`!stage.is_completed`) and has an actionable deadline in the future (`stage.deadline > Date.now()`), OR
3. Fallback to the first stage in the sorted sequence (`sort_order`).

## 2. Temporal Scheduling Matrix

Stages define up to three distinct milestone timestamps:
- `window_start`: Opening time for submissions or sprint kickoff.
- `actionable_deadline`: Soft deadline (typically 30–60 minutes prior to hard freeze to prevent platform submission crashes).
- `window_end` / `deadline`: Hard cutoff enforced by the competition portal.

### Urgency Thresholds
| Time Remaining | Visual Treatment | Operational Meaning |
|---|---|---|
| `> 72 hours` | Standard Panel | Normal development pace |
| `24h - 72h` | Gold / Warning Border | Focus on primary deliverables |
| `< 24 hours` | Critical Coral Border | Pre-flight submission verification |
| `< 6 hours` | Pulsing Urgent State | Code freeze and slide turn-in |

## 3. Deliverable Ownership vs. Completion

To maintain clear team accountability during hackathons:
- **Assignment (`assigned_to`)**: Indicates who is currently responsible for the task. Claiming a task does not mark it complete.
- **Completion (`is_done`)**: Toggled once verified. Records `done_by` (user ID) and `done_at` (timestamp) for transparent audit history.
