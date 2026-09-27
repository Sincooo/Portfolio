import { readFile, writeFile } from 'node:fs/promises';
import { parseCalendar, requestGitHub as request } from './github-data.mjs';
const output = new URL('../src/data/github.json', import.meta.url);
let previous;
try { previous = JSON.parse(await readFile(output, 'utf8')); } catch { previous = null; }
const results = await Promise.allSettled([
  request('https://api.github.com/users/Sincooo/repos?per_page=100&sort=updated', true),
  request('https://github.com/users/Sincooo/contributions'),
]);
const snapshot = previous || { user: 'Sincooo', repositories: [], days: [] };
if (results[0].status === 'fulfilled') {
  snapshot.repositories = results[0].value.filter(repo => !repo.private).slice(0, 6).map(repo => ({
    name: repo.name, description: repo.description || '', url: repo.html_url,
    language: repo.language || '', stars: repo.stargazers_count, forks: repo.forks_count,
    updated: repo.updated_at, fork: repo.fork,
  }));
  snapshot.repositoriesUpdated = new Date().toISOString();
} else console.warn('GitHub repositories: using the last saved snapshot.');
try {
  if (results[1].status !== 'fulfilled') throw results[1].reason;
  snapshot.days = parseCalendar(results[1].value);
  snapshot.contributionsUpdated = new Date().toISOString();
} catch { console.warn('GitHub contributions: using the last saved snapshot.'); }
if (!snapshot.repositories.length || !snapshot.days.length) throw new Error('A complete initial GitHub snapshot is required');
await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`GitHub snapshot: ${snapshot.repositories.length} repositories, ${snapshot.days.length} days, ${snapshot.days.reduce((sum, day) => sum + day.count, 0)} contributions.`);
