# Pre-Flight Submission Readiness Matrix

This specification details the diagnostic heuristics and access verification rules used by HackFlow prior to final competition submission.

## 1. Provider Verification Heuristics

Hackathon turn-in forms (Devfolio, Devpost, Unstop, MLH) frequently disqualify projects due to private repositories, restricted Google Drives, or unlisted YouTube video permissions.

| Provider / Asset | Probe Mechanism | Success Criterion | Failure Risk |
|---|---|---|---|
| **GitHub Repository** | HTTP Head / Raw Endpoint | HTTP 200 (Accessible) | 404 indicates either private repository or incorrect URL slug |
| **YouTube Demo Video** | YouTube oEmbed (`/oembed?url=...`) | HTTP 200 (Public / Unlisted) | 401/403 indicates Private video (judges cannot view) |
| **Google Drive / Slides** | Public ID format check | Valid sharing link structure | Warning: Must verify access is set to "Anyone with the link" |
| **Figma Prototype** | URL slug and file ID inspection | Valid file or prototype URL | Warning: Verify workspace viewing permissions |
| **Live Web App / Demo** | Public HTTPS reachability | Valid TLS and HTTP response | Mixed content or deployment spin-down errors |

## 2. Zero-OAuth Privacy Verification

To verify submission readiness without asking users for privileged OAuth credentials:
- **YouTube oEmbed**: YouTube provides an unauthenticated endpoint returning HTTP 200 for both Public and Unlisted videos, while rejecting Private videos with 401/403.
- **Incognito Test Links**: The UI surfaces quick-open test links with clean query parameters so team members can verify permissions in a clean browser session without cached credentials.
