import { parseCalendar, requestGitHub } from '../scripts/github-data.mjs';

// A short CDN cache avoids hitting GitHub for every visitor. No token is needed.
export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.statusCode = 405;
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  try {
    const days = parseCalendar(await requestGitHub('https://github.com/users/Sincooo/contributions'));
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    response.statusCode = 200;
    response.end(JSON.stringify({ user: 'Sincooo', days, updated: new Date().toISOString() }));
  } catch {
    response.setHeader('Cache-Control', 'no-store');
    response.statusCode = 503;
    response.end(JSON.stringify({ error: 'GitHub activity is temporarily unavailable' }));
  }
}
