export function getDefaultDeliverables(stageType: string): string[] {
  switch (stageType) {
    case 'quiz':
      return [
        'Verify platform login credentials',
        'Note test window date and time',
        'Confirm all team members availability',
        'Log in 15 minutes before start time',
        'Keep backup device ready'
      ];
    case 'ppt_submission':
      return [
        'Define problem statement clearly',
        'Complete architecture diagram',
        'Document solution approach',
        'Create slide deck (max 10-15 slides)',
        'Add team introduction slide',
        'Export to PDF (under 20MB)',
        'Upload to submission portal',
        'Verify submission confirmation'
      ];
    case 'prototype':
      return [
        'Initialize GitHub repository (public)',
        'Write comprehensive README',
        'Document environment variables',
        'Set up CI/CD pipeline',
        'Deploy live demo',
        'Record 2-minute demo video',
        'Verify all links are accessible',
        'Final code review and cleanup'
      ];
    case 'presentation':
      return [
        'Finalize pitch deck',
        'Rehearse presentation (time it)',
        'Test demo environment',
        'Prepare backup slides/offline demo',
        'Complete Q&A preparation',
        'Confirm travel and logistics',
        'Charge all devices'
      ];
    case 'other':
    default:
      return [
        'Review round requirements',
        'Prepare deliverables',
        'Complete submission',
        'Verify submission confirmation'
      ];
  }
}
