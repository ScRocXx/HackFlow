import assert from 'node:assert/strict';
import { 
  extractMetadata, 
  cleanTitle, 
  extractHostnameRoot, 
  extractUniversalDateAnchors 
} from '@/lib/extraction/jsonld-extractor';
import { 
  preFilterMarkdown, 
  htmlToCleanText 
} from '@/lib/extraction/jina-reader';
import { 
  detectPlatform, 
  heuristicExtract, 
  StageSchema, 
  ParsedHackathonSchema 
} from '@/lib/extraction/gemini-parser';

console.log('=== Universal Event Parser Verification Suite ===\n');

// --- Test 1: Title Cleaning & Branding Removal ---
console.log('Test 1: Title Cleaning');
{
  assert.equal(
    cleanTitle('HackMIT 2026 | Registration & Info | Devpost', undefined, 'Devpost'),
    'HackMIT 2026 | Registration & Info'
  );
  assert.equal(
    cleanTitle('Global AI Challenge - Unstop', 'Unstop', 'unstop'),
    'Global AI Challenge'
  );
  assert.equal(
    cleanTitle('CodeFest 2026 – Major League Hacking', 'Major League Hacking'),
    'CodeFest 2026'
  );
  assert.equal(
    cleanTitle('PennApps XXV | PennApps', 'PennApps'),
    'PennApps XXV'
  );
  assert.equal(
    cleanTitle('Winter Sprint 2026'),
    'Winter Sprint 2026'
  );
  console.log('✓ Title cleaning works correctly for pipe delimiters and site branding.');
}

// --- Test 2: Hostname Root Derivation ---
console.log('\nTest 2: Hostname Root Derivation');
{
  assert.deepEqual(
    extractHostnameRoot('https://hackmit.org/2026/apply'),
    { root: 'hackmit', displayName: 'HackMIT' }
  );
  assert.deepEqual(
    extractHostnameRoot('https://devpost.com/software/hackflow'),
    { root: 'devpost', displayName: 'Devpost' }
  );
  assert.deepEqual(
    extractHostnameRoot('https://summit.bits-pilani.ac.in/events'),
    { root: 'bits-pilani', displayName: 'Bits Pilani' }
  );
  assert.deepEqual(
    extractHostnameRoot('https://sub.innovation-challenge.co.in'),
    { root: 'innovation-challenge', displayName: 'Innovation Challenge' }
  );
  assert.deepEqual(
    extractHostnameRoot('https://hack.mit.edu'),
    { root: 'mit', displayName: 'MIT' }
  );
  assert.deepEqual(
    extractHostnameRoot('https://app.box.com/hackathon'),
    { root: 'box', displayName: 'Box' }
  );
  assert.deepEqual(
    extractHostnameRoot('https://cloud.ibm.com/events'),
    { root: 'ibm', displayName: 'IBM' }
  );
  console.log('✓ Hostname root derivation works for standard domains, ccTLDs, and 3-letter domains.');
}

// --- Test 3: W3C / OpenGraph Meta Extraction ---
console.log('\nTest 3: W3C / OpenGraph & JSON-LD Extraction');
{
  const mockHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Stanford TreeHacks 2026 | Devpost</title>
        <meta property="og:title" content="TreeHacks 2026 | Devpost" />
        <meta property="og:site_name" content="Devpost" />
        <meta property="og:image" content="https://treehacks.com/banner.png" />
        <meta property="og:description" content="Stanford's premier collegiate hackathon." />
        <time datetime="2026-02-13T18:00:00Z"></time>
        <time datetime="2026-02-15T12:00:00Z"></time>
      </head>
      <body>
        <h1>TreeHacks 2026</h1>
      </body>
    </html>
  `;

  const meta = extractMetadata(mockHtml, 'https://treehacks.devpost.com');
  assert.ok(meta);
  assert.equal(meta.title, 'TreeHacks 2026');
  assert.equal(meta.organizer, 'Devpost');
  assert.equal(meta.banner_url, 'https://treehacks.com/banner.png');
  assert.equal(meta.description, "Stanford's premier collegiate hackathon.");
  assert.ok(meta.date_anchors && meta.date_anchors.length === 2);
  assert.equal(meta.startDate, '2026-02-13T18:00:00.000Z');
  assert.equal(meta.endDate, '2026-02-15T12:00:00.000Z');
  console.log('✓ Deterministic OpenGraph, W3C, and date anchors extracted correctly.');
}

// --- Test 4: JSON-LD Extraction & Precedence ---
console.log('\nTest 4: Schema.org JSON-LD Extraction');
{
  const mockJsonLdHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Hackathon",
          "name": "CalHacks 12.0",
          "startDate": "2026-10-23T18:00:00-07:00",
          "endDate": "2026-10-25T14:00:00-07:00",
          "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
          "organizer": {
            "@type": "Organization",
            "name": "CalHacks Team"
          },
          "location": "San Francisco, CA",
          "image": "https://calhacks.io/cover.jpg"
        }
        </script>
      </head>
    </html>
  `;

  const meta = extractMetadata(mockJsonLdHtml, 'https://calhacks.io');
  assert.ok(meta);
  assert.equal(meta.title, 'CalHacks 12.0');
  assert.equal(meta.organizer, 'CalHacks Team');
  assert.equal(meta.mode, 'online');
  assert.equal(meta.banner_url, 'https://calhacks.io/cover.jpg');
  assert.equal(meta.location, 'San Francisco, CA');
  assert.ok(meta.startDate);
  assert.ok(meta.endDate);
  console.log('✓ Schema.org Event/Hackathon JSON-LD extracted correctly.');
}

// --- Test 5: Markdown Body Pruning & Schedule Preservation ---
console.log('\nTest 5: Non-Destructive Markdown Pruning');
{
  const rawMarkdownWithSchedule = `
# Awesome Hackathon 2026
Join us for 48 hours of building!

data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=

<svg width="100" height="100"><path d="M10 10 H 90 V 90 H 10 L 10 10" /></svg>

<script>alert('track');</script>
<style>.body { color: red; }</style>

## Event Schedule & Universal Lifecycle Phases
- **Phase 1: Registration Closes**: October 20, 2026 at 11:59 PM IST
- **Phase 2: Idea Submission**: October 22, 2026 at 5:00 PM IST
- **Phase 3: Active Hacking Sprint Kickoff**: October 24, 2026 at 9:00 AM IST
- **Phase 3: Final Code Freeze / Submission**: October 26, 2026 at 9:00 AM IST
- **Phase 4: Final Demo Day & Judging**: October 26, 2026 at 3:00 PM IST

## Similar Hackathons You Might Like
- Other Hackathon A
- Other Hackathon B
  `;

  const filtered = preFilterMarkdown(rawMarkdownWithSchedule);
  
  // Base64, SVG, scripts, styles MUST be stripped
  assert.ok(!filtered.includes('base64,iVBOR'));
  assert.ok(!filtered.includes('<svg'));
  assert.ok(!filtered.includes('<script'));
  assert.ok(!filtered.includes('<style'));

  // ALL schedule, timeline, and body content MUST be preserved (No truncating markdown!)
  assert.ok(filtered.includes('Phase 1: Registration Closes'));
  assert.ok(filtered.includes('Phase 2: Idea Submission'));
  assert.ok(filtered.includes('Phase 3: Active Hacking Sprint Kickoff'));
  assert.ok(filtered.includes('Phase 3: Final Code Freeze / Submission'));
  assert.ok(filtered.includes('Phase 4: Final Demo Day & Judging'));
  assert.ok(filtered.includes('Similar Hackathons You Might Like'));
  console.log('✓ Full readable text preserved. Schedule and timelines are never truncated.');
}

// --- Test 6: Universal Site-Agnostic Platform Detection ---
console.log('\nTest 6: Site-Agnostic Platform Detection');
{
  assert.equal(detectPlatform('https://devpost.com/hackathons/xyz'), 'devpost');
  assert.equal(detectPlatform('https://unstop.com/competitions/abc'), 'unstop');
  assert.equal(detectPlatform('https://hackmit.org/apply'), 'hackmit');
  assert.equal(detectPlatform('https://calhacks.io'), 'calhacks');
  assert.equal(detectPlatform('https://myuniversity.edu/hackathon'), 'myuniversity');
  assert.equal(detectPlatform(), 'custom');
  console.log('✓ Dynamic platform detection works site-agnostically with zero hardcoded branches.');
}

// --- Test 7: Strict Zero-Hallucination Date Enforcement ---
console.log('\nTest 7: Strict Zero-Hallucination Dates in StageSchema');
{
  // Stage with no date provided must retain deadline: null and raw_date_snippet: 'TBA'
  const tbaStage = StageSchema.parse({
    round_number: 1,
    title: 'Round 1: Idea Submission',
    stage_type: 'ppt_submission',
    deadline: null,
    window_start: null,
    window_end: null,
    actionable_deadline: null,
    raw_date_snippet: null,
  });

  assert.equal(tbaStage.deadline, null);
  assert.equal(tbaStage.window_start, null);
  assert.equal(tbaStage.window_end, null);
  assert.equal(tbaStage.actionable_deadline, null);
  assert.equal(tbaStage.raw_date_snippet, 'TBA');

  // Stage with explicit date
  const datedStage = StageSchema.parse({
    round_number: 2,
    title: 'Round 2: Hackathon Sprint',
    stage_type: 'hackathon_sprint',
    deadline: '2026-10-26T09:00:00+05:30',
    window_start: '2026-10-24T09:00:00+05:30',
    window_end: '2026-10-26T09:00:00+05:30',
    actionable_deadline: '2026-10-24T09:00:00+05:30',
    raw_date_snippet: 'Oct 24 - 26, 2026',
  });

  assert.equal(datedStage.deadline, '2026-10-26T09:00:00+05:30');
  assert.equal(datedStage.window_start, '2026-10-24T09:00:00+05:30');
  assert.equal(datedStage.stage_type, 'hackathon_sprint');
  assert.equal(datedStage.raw_date_snippet, 'Oct 24 - 26, 2026');
  console.log('✓ Zero-hallucination dates verified. Unannounced dates remain null and TBA.');
}

// --- Test 8: Heuristic Fallback Parser ---
console.log('\nTest 8: Heuristic Fallback Parser');
{
  const markdownContent = `
# CyberShield Ideathon 2026
Hosted by CyberDefense Labs.
Total Cash Prize: ₹1,50,000 Cash prizes for top winners!
Join us online for the national cybersecurity challenge.

[Problem Statement PDF](https://example.com/cyber-problem-statement.pdf)
[Guidelines](https://example.com/guidelines.pdf)
  `;

  const parsed = heuristicExtract(markdownContent, 'https://cybershield.org');
  assert.equal(parsed.title, 'CyberShield Ideathon 2026');
  assert.equal(parsed.source_platform, 'cybershield');
  assert.equal(parsed.organizer, 'Cybershield');
  assert.equal(parsed.stages.length, 1);
  assert.equal(parsed.stages[0].deadline, null);
  assert.equal(parsed.stages[0].raw_date_snippet, 'TBA');
  assert.ok(parsed.resources.length >= 1);
  assert.equal(parsed.resources[0].resource_type, 'problem_statement');
  console.log('✓ Heuristic fallback parser extracts clean metadata, zero synthetic dates, and resources.');
}

// --- Test 9: Empty & Boundary Inputs ---
console.log('\nTest 9: Empty & Boundary Values');
{
  assert.equal(extractMetadata(''), null);
  assert.equal(preFilterMarkdown(''), '');
  assert.equal(cleanTitle(''), '');
  assert.equal(extractHostnameRoot(''), null);
  assert.equal(extractUniversalDateAnchors('').length, 0);
  console.log('✓ Handles empty/null/boundary values without exceptions.');
}

// --- Test 10: Twitter Cards & Inverted Meta Attribute Order ---
console.log('\nTest 10: Twitter Cards & Inverted Meta Attribute Order');
{
  const twitterHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta content="InnovateX 2026 | Twitter" name="twitter:title" />
        <meta content="@InnovateXOrg" name="twitter:site" />
        <meta content="https://example.com/tw-banner.jpg" name="twitter:image" />
        <meta content="Annual open-source sprint" name="twitter:description" />
      </head>
    </html>
  `;
  const meta = extractMetadata(twitterHtml, 'https://innovatex.io');
  assert.ok(meta);
  assert.equal(meta.title, 'InnovateX 2026');
  assert.equal(meta.organizer, 'InnovateXOrg');
  assert.equal(meta.banner_url, 'https://example.com/tw-banner.jpg');
  assert.equal(meta.description, 'Annual open-source sprint');
  console.log('✓ Inverted attributes and Twitter Card metadata parsed properly.');
}

// --- Test 11: Schema.org @graph with Complex Nesting ---
console.log('\nTest 11: Schema.org @graph Nesting');
{
  const graphHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "name": "Portal"
            },
            {
              "@type": "Hackathon",
              "name": "MIT Energy Hack 2026",
              "startDate": "2026-11-13T17:00:00Z",
              "endDate": "2026-11-15T18:00:00Z",
              "organizer": {
                "@type": "Organization",
                "name": "MIT Energy Club"
              },
              "image": [
                {
                  "@type": "ImageObject",
                  "url": "https://energyhack.mit.edu/banner.png"
                }
              ]
            }
          ]
        }
        </script>
      </head>
    </html>
  `;
  const meta = extractMetadata(graphHtml, 'https://energyhack.mit.edu');
  assert.ok(meta);
  assert.equal(meta.title, 'MIT Energy Hack 2026');
  assert.equal(meta.organizer, 'MIT Energy Club');
  assert.equal(meta.banner_url, 'https://energyhack.mit.edu/banner.png');
  assert.equal(meta.startDate, '2026-11-13T17:00:00.000Z');
  console.log('✓ Complex Schema.org @graph structures parsed accurately.');
}

// --- Test 12: Full ParsedHackathonSchema Validation for Universal Lifecycle ---
console.log('\nTest 12: Universal Lifecycle ParsedHackathonSchema Validation');
{
  const fullCompetition = ParsedHackathonSchema.parse({
    title: 'Global Hackathon 2026',
    organizer: 'Tech Alliance',
    source_platform: 'globalhack',
    mode: 'online',
    stages: [
      {
        round_number: 1,
        title: 'Phase 1: Registration Deadline',
        stage_type: 'other',
        deadline: '2026-10-15T23:59:59+05:30',
        window_end: '2026-10-15T23:59:59+05:30',
        raw_date_snippet: 'Oct 15, 2026',
      },
      {
        round_number: 2,
        title: 'Phase 2: Idea Submission / Screening',
        stage_type: 'ppt_submission',
        deadline: null,
        raw_date_snippet: 'TBA',
      },
      {
        round_number: 3,
        title: 'Phase 3: Active Hacking Sprint Window',
        stage_type: 'hackathon_sprint',
        window_start: '2026-10-20T09:00:00+05:30',
        window_end: '2026-10-22T18:00:00+05:30',
        deadline: '2026-10-22T18:00:00+05:30',
        actionable_deadline: '2026-10-20T09:00:00+05:30',
        raw_date_snippet: 'Oct 20-22, 2026',
      },
      {
        round_number: 4,
        title: 'Phase 4: Final Evaluation / Demo Day',
        stage_type: 'presentation',
        deadline: '2026-10-25T15:00:00+05:30',
        raw_date_snippet: 'Oct 25, 2026',
      }
    ],
    prizes: {
      display_summary: '₹5,00,000 Cash + AWS Credits',
      cash_pool: '₹5,00,000',
      first_place_cash: '₹2,50,000',
      has_perks_or_credits: true,
      raw_prize_text: '₹5,00,000 in cash prizes and $50k in AWS cloud credits',
    }
  });

  assert.equal(fullCompetition.stages.length, 4);
  assert.equal(fullCompetition.stages[1].deadline, null);
  assert.equal(fullCompetition.stages[1].raw_date_snippet, 'TBA');
  assert.equal(fullCompetition.stages[2].stage_type, 'hackathon_sprint');
  assert.equal(fullCompetition.stages[2].window_start, '2026-10-20T09:00:00+05:30');
  assert.equal(fullCompetition.prizes.has_perks_or_credits, true);
  console.log('✓ Universal 4-phase lifecycle data validates cleanly with zero errors.');
}

// --- Test 13: Unquoted & Loosely-Quoted Meta Tag Extraction ---
console.log('\nTest 13: Unquoted & Loosely-Quoted HTML Meta Tags');
{
  const unquotedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property=og:title content=AwesomeHackathon>
        <meta name=author content="Tech Labs">
        <meta property=og:image content=https://example.com/logo.png>
      </head>
    </html>
  `;
  const meta = extractMetadata(unquotedHtml, 'https://example.com');
  assert.ok(meta);
  assert.equal(meta.title, 'AwesomeHackathon');
  assert.equal(meta.organizer, 'Tech Labs');
  assert.equal(meta.banner_url, 'https://example.com/logo.png');
  console.log('✓ Unquoted and loosely-quoted meta attributes extracted correctly.');
}

// --- Test 14: HTML Entities & Delimiter Decoding in Titles ---
console.log('\nTest 14: HTML Entity Decoding & Delimiters in Titles');
{
  assert.equal(
    cleanTitle('HackFlow&#x27;s Sprint 2026 &ndash; Devpost', 'Devpost'),
    "HackFlow's Sprint 2026"
  );
  assert.equal(
    cleanTitle('AI Frontier &mdash; Global Challenge &mdash; Unstop', 'Unstop'),
    'AI Frontier — Global Challenge'
  );
  assert.equal(
    cleanTitle('Global Hackathon 2026 | | |'),
    'Global Hackathon 2026'
  );
  console.log('✓ Hex entities (&#x27;), named dashes (&ndash;, &mdash;), and multiple trailing pipes cleaned.');
}

// --- Test 15: Protocol-Relative Banner URL Resolution ---
console.log('\nTest 15: Protocol-Relative Banner URL Resolution');
{
  const protoRelativeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:image" content="//cdn.devpost.com/hackathons/banner.jpg" />
        <title>Campus Sprint 2026</title>
      </head>
    </html>
  `;
  const meta = extractMetadata(protoRelativeHtml);
  assert.ok(meta);
  assert.equal(meta.banner_url, 'https://cdn.devpost.com/hackathons/banner.jpg');
  console.log('✓ Protocol-relative banner URLs starting with // properly resolve to https://.');
}

// --- Test 16: Chronologically Sorted Date Anchors & String "null" Date Sanitization ---
console.log('\nTest 16: Date Anchors Sorting & String "null" Sanitization');
{
  const htmlWithUnorderedDates = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="event:end_time" content="2026-11-20T18:00:00Z" />
        <meta content="2026-11-18T09:00:00Z" itemprop="startDate" />
      </head>
    </html>
  `;
  const anchors = extractUniversalDateAnchors(htmlWithUnorderedDates);
  assert.equal(anchors.length, 2);
  assert.equal(anchors[0], '2026-11-18T09:00:00.000Z'); // Start date first
  assert.equal(anchors[1], '2026-11-20T18:00:00.000Z'); // End date second

  // Test String "null" / "undefined" / "TBA" sanitization in StageSchema
  const sanitizedStage = StageSchema.parse({
    round_number: 1,
    title: 'Round 1: Screening',
    stage_type: 'ppt_submission',
    deadline: 'null',
    window_start: 'undefined',
    window_end: 'null',
    actionable_deadline: 'none',
    raw_date_snippet: 'null',
  });

  assert.equal(sanitizedStage.deadline, null);
  assert.equal(sanitizedStage.window_start, null);
  assert.equal(sanitizedStage.window_end, null);
  assert.equal(sanitizedStage.actionable_deadline, null);
  assert.equal(sanitizedStage.raw_date_snippet, 'TBA');
  console.log('✓ Date anchors sorted chronologically and string "null" dates coerced to true null.');
}

console.log('\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===');

