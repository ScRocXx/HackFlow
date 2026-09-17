/**
 * Production technical deliverables and milestone templates.
 * Pruned of generic fluff to focus purely on high-leverage hackathon execution.
 */
export function getDefaultDeliverables(stageType: string): string[] {
  switch (stageType) {
    case 'quiz':
      return [
        'Verify platform login credentials & authentication',
        'Confirm assessment window schedule & timezone offset',
        'Review syllabus, problem statement themes & track topics',
        'Conduct system speed test & network stability check',
      ];

    case 'ppt_submission':
      return [
        'Draft problem statement & core user pain point',
        'Complete system architecture diagram & data flow',
        'Benchmark competitive landscape & unfair advantage',
        'Build 10-slide pitch deck (Problem, Tech Stack, Roadmap, Team)',
        'Export pitch deck as high-res PDF under 20MB limit',
        'Verify public viewing permissions for cloud-hosted slides',
      ];

    case 'prototype':
    case 'hackathon_sprint':
      return [
        'Initialize public GitHub repository with open license',
        'Configure environment variables template (.env.example)',
        'Deploy production demo to cloud (Vercel / Render / Fly.io)',
        'Record 2-minute Loom / YouTube walkthrough demo video',
        'Write technical README with architecture & run instructions',
        'Run pre-submission smoke test on judge accessibility',
      ];

    case 'presentation':
      return [
        'Finalize 3-minute judge pitch deck & slide flow',
        'Stage offline local demo fallback & seed test database',
        'Record demo backup video in case of venue Wi-Fi failure',
        'Prepare responses for 5 hardest judge technical objections',
        'Verify slide aspect ratio & display resolution',
      ];

    case 'other':
    default:
      return [
        'Define technical deliverable scope & acceptance criteria',
        'Build and package submission code assets',
        'Verify external link access and upload confirmation receipt',
      ];
  }
}
