export async function fetchUrlContent(url: string): Promise<{ title: string; content: string; url: string }> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const apiKey = process.env.JINA_API_KEY;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Wait-For-Selector': 'main, #content, .hackathon-content, .challenge-detail, .timeline',
    'X-Timeout': '30',
    'X-Remove-Selector': 'header, footer, nav, .cookie-banner, .advertisement, .sidebar, .mega-dropdown, .dropdown-menu, .is_header, .footer, .login-modal, .registration-modal',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Jina API: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();

    if (json.code !== 200) {
      throw new Error(`Jina API error: ${json.code} - ${JSON.stringify(json.status)}`);
    }

    const { data } = json;

    const rawContent = data.content || '';
    const cleaned = cleanMarkdownContent(rawContent);

    return {
      title: data.title || '',
      content: cleaned || rawContent,
      url: data.url || url,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Fetch timed out after 30 seconds for URL: ${url}`);
      }
      throw error;
    }
    throw new Error('An unknown error occurred while fetching URL content');
  } finally {
    clearTimeout(timeoutId);
  }
}

export function cleanMarkdownContent(raw: string): string {
  if (!raw) return '';
  return raw
    // Remove navigation link blocks
    .replace(/\[(?:Jobs|Internships|Fresher Jobs|Placement Courses)[^\]]*\]\([^)]+\)/gi, '')
    .replace(/\* \[Jobs in [^\]]+\]\([^)]+\)/gi, '')
    .replace(/Internship by (?:Places|Stream)[\s\S]*?View all internship[^\n]*/gi, '')
    .replace(/Jobs by (?:Places|Type)[\s\S]*?View all jobs[^\n]*/gi, '')
    .replace(/Fresher Jobs by (?:Places|Type)[\s\S]*?View all fresher jobs[^\n]*/gi, '')
    .replace(/\[Forgot Password\?\][\s\S]*?Register now[^\n]*/gi, '')
    // Collapse whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

