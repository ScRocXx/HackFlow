'use client'

import JSZip from 'jszip'
import type { Event, EventStage, StageDeliverable, EventProblemStatement, EventResource } from '@/lib/supabase/types'

export interface OfflinePackageData {
  event: Event
  stages?: EventStage[]
  deliverables?: StageDeliverable[]
  problemStatements?: EventProblemStatement[]
  resources?: EventResource[]
  participants?: { full_name?: string; email?: string; role?: string }[]
}

/**
 * Client-side Offline Pitch Packager using JSZip.
 * Generates an emergency offline `.zip` kit containing:
 * - README.md (pitch summary, problem statement, architecture, judge notes)
 * - MANIFEST.json (full machine-readable offline state)
 * - DELIVERABLES_CHECKLIST.md (audit log of completed/pending milestones)
 * - RESOURCES.md (direct links to offline kits, problem statements, rulebooks)
 */
export async function generateOfflinePitchPackage(data: OfflinePackageData): Promise<Blob> {
  const zip = new JSZip()
  const { event, stages = [], deliverables = [], problemStatements = [], resources = [], participants = [] } = data

  const chosenStatement = problemStatements.find(p => p.is_chosen) || problemStatements[0]

  // 1. README.md
  const readmeContent = `# ${event.title} - Offline Pitch Kit
Generated via HackFlow Emergency Telemetry on ${new Date().toLocaleString()}

## Competition Info
- **Organizer:** ${event.organizer || 'N/A'}
- **Platform:** ${event.source_platform?.toUpperCase() || 'CUSTOM'}
- **Mode:** ${event.mode?.toUpperCase() || 'ONLINE'}
- **Prize Pool:** ${event.prize_pool || 'N/A'}

---

## Chosen Problem Statement & Direction
**Title:** ${chosenStatement?.title || 'Open Innovation'}
**Domain/Category:** ${chosenStatement?.category || 'General'}

### Overview
${chosenStatement?.description || event.overview || 'See project details.'}

${chosenStatement?.solution_bullets && chosenStatement.solution_bullets.length > 0 ? `
### Key Solution Capabilities
${chosenStatement.solution_bullets.map((b) => `- ${b}`).join('\n')}
` : ''}

---

## Squad Roster
${participants.length > 0 ? participants.map((p, idx) => `
${idx + 1}. **${p.full_name || 'Squad Member'}** (${p.role?.toUpperCase() || 'MEMBER'}) - \`${p.email || 'N/A'}\`
`).join('') : '- Squad Lead'}

---

## Submission Artifacts & Verification
- **GitHub Repo:** ${event.github_repo_url || 'N/A'}
- **Live Demo URL:** ${event.demo_url || 'N/A'}
- **Pitch Deck:** ${event.pitch_deck_url || 'N/A'}
- **Submission Receipt ID:** ${event.submission_receipt || 'N/A'}
- **Testing Notes / Credentials:** ${event.submission_notes || 'N/A'}

---

## Presentation Checklist (Offline Protocol)
1. Ensure screen resolution is set to 1080p for presentation projector.
2. Verify local demo server is running and bound to 0.0.0.0 / localhost.
3. Keep PDF slides opened locally in full-screen reader.
4. Keep video backup (MP4) in folder in case of live demo glitch.
`

  zip.file('README.md', readmeContent.trim())

  // 2. DELIVERABLES_CHECKLIST.md
  let checklistContent = `# Deliverables & Milestone Audit\n\n`
  if (stages.length > 0) {
    stages.forEach((stg) => {
      checklistContent += `## Round ${stg.round_number}: ${stg.title}\n`
      checklistContent += `- **Deadline:** ${stg.deadline ? new Date(stg.deadline).toLocaleString() : 'TBA'}\n`
      checklistContent += `- **Status:** ${stg.is_completed ? 'COMPLETED' : 'IN SPRINT'}\n\n`
    })
  }

  if (deliverables.length > 0) {
    checklistContent += `### Stage Deliverables Items\n`
    deliverables.forEach((d) => {
      checklistContent += `- [${d.is_done ? 'x' : ' '}] ${d.title}\n`
    })
  }

  zip.file('DELIVERABLES_CHECKLIST.md', checklistContent.trim())

  // 3. RESOURCES.md
  if (resources.length > 0) {
    let resourcesContent = `# Competition Resources & Guidelines\n\n`
    resources.forEach((r) => {
      resourcesContent += `- **${r.title}** (${r.resource_type}): ${r.url}\n`
    })
    zip.file('RESOURCES.md', resourcesContent.trim())
  }

  // 4. MANIFEST.json
  const manifest = {
    generated_at: new Date().toISOString(),
    event_id: event.id,
    title: event.title,
    organizer: event.organizer,
    status: event.status,
    links: {
      github: event.github_repo_url,
      demo: event.demo_url,
      pitch_deck: event.pitch_deck_url,
      receipt: event.submission_receipt,
    },
    stages,
    deliverables,
    problem_statements: problemStatements,
    resources,
    participants,
  }

  zip.file('MANIFEST.json', JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'blob' })
}

/**
 * Triggers an instant download of the offline pitch package in the browser.
 */
export async function downloadOfflinePitchPackage(data: OfflinePackageData, filename?: string) {
  const blob = await generateOfflinePitchPackage(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (filename || data.event.title || 'PitchKit').replace(/[^a-zA-Z0-9_-]/g, '_')
  a.download = `HackFlow_OfflineKit_${safeName}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
