// Shared by the release snapshot and the Vercel endpoint. Only public data is requested.
export const requestGitHub = async (url, json = false) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'Sincooo-Portfolio', Accept: json ? 'application/vnd.github+json' : 'text/html' }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return json ? response.json() : response.text();
};

export const parseCalendar = (html) => {
  const labels = new Map([...html.matchAll(/<tool-tip\b([^>]*)>([^<]*)<\/tool-tip>/g)].map(([, attributes, label]) => [attributes.match(/for="([^"]+)"/)?.[1], label]));
  const days = [...html.matchAll(/<td\b([^>]*data-date="[^>]+)>/g)].map(([, attributes]) => {
    const date = attributes.match(/data-date="([\d-]+)"/)?.[1];
    const id = attributes.match(/\bid="([^"]+)"/)?.[1];
    const levelText = attributes.match(/data-level="([0-4])"/)?.[1];
    const label = labels.get(id);
    const countText = label?.match(/^([\d,]+) contributions?/)?.[1];
    const count = label?.startsWith('No contributions') ? 0 : Number(countText?.replaceAll(',', ''));
    if (!date || !label || levelText === undefined || !Number.isInteger(count) || count < 0) throw new Error('Unexpected contribution calendar format');
    return { date, count, level: Number(levelText) };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (days.length < 350 || days.length > 371 || new Set(days.map(day => day.date)).size !== days.length) throw new Error('Incomplete contribution calendar');
  return days;
};
