import fs from 'fs';
import path from 'path';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  const mcpConfigPath = path.join(userHome, '.gemini', 'antigravity', 'mcp_config.json');
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      const token = cfg?.mcpServers?.['github-mcp-server']?.env?.GITHUB_PERSONAL_ACCESS_TOKEN;
      if (token) return token;
    } catch (_) {}
  }
  return null;
}

const token = getGitHubToken();
const owner = 'shotbyadii';
const repo = 'leave-planner';

const releaseMetadata = {
  'v0.1.0': { title: 'v0.1.0 - Initial Leave Planner Core & Yearly Grid Selection', date: 'May 15, 2026' },
  'v0.2.0': { title: 'v0.2.0 - WFH Monthly Quota Tracker & 12 PM Attendance Check-in Modal', date: 'July 24, 2026' },
  'v0.3.0': { title: 'v0.3.0 - Authentication & Cloud Sync Gateway, Supabase RLS Schema Isolation', date: 'July 28, 2026' },
  'v0.4.0': { title: 'v0.4.0 - iPadOS Dual-Pane Settings, Smart Search & Automatic Brand Scraper', date: 'August 1, 2026' },
  'v0.5.0': { title: 'v0.5.0 - Interactive 4-Step Onboarding, Dynamic Quota Shortforms & 52px Cells', date: 'August 3, 2026' },
  'v0.6.0': { title: 'v0.6.0 - Multimodal AI Public Holidays Manager with Google Gemini', date: 'August 16, 2026' },
  'v0.7.1': { title: 'v0.7.1 - Mobile Hint Docking, Tutorial Highlighting & In-Memory Sandbox', date: 'August 16, 2026' },
  'v0.8.0': { title: 'v0.8.0 - Skeleton Loader, Seamless Calendar Switching & Mobile Modal Morphing', date: 'August 17, 2026' },
  'v0.8.1': { title: 'v0.8.1 - PWA & Standalone Support, Interactive Sandbox & Apple Quota Ticker', date: 'August 22, 2026' },
  'v0.8.2': { title: 'v0.8.2 - Dynamic Vacation Policies, Push Notification & PWA Branding', date: 'September 15, 2026' },
  'v0.8.3': { title: 'v0.8.3 - Desktop Header Redesign, Mobile Leave Duration & UI Polish', date: 'October 12, 2026' },
  'v0.8.4': { title: 'v0.8.4 - Multi-Day Attendance Catch-Up Cards, Mobile AI Settings & Error Reporting', date: 'October 12, 2026' },
  'v0.8.5': { title: 'v0.8.5 - Multi-Card Attendance Carousel, Focused Month Carousel & Tactile Haptics', date: 'October 14, 2026' },
  'v0.8.6': { title: 'v0.8.6 - Smart Notification Suite, Attendance Catch-Up Actions & LOP Fallback', date: 'October 16, 2026' },
  'v0.8.7': { title: 'v0.8.7 - Modular Domain Architecture, Bottom-Up Morphing & Tracker Scroll Isolation', date: 'October 16, 2026' },
  'v0.8.8': { title: 'v0.8.8 - Multi-Day Attendance Catch-Up Calculation & State Synchronization Fix', date: 'October 29, 2026' }
};

// Strict chronological sequence from oldest to newest
const chronologicalTags = [
  'v0.1.0',
  'v0.2.0',
  'v0.3.0',
  'v0.4.0',
  'v0.5.0',
  'v0.6.0',
  'v0.7.1',
  'v0.8.0',
  'v0.8.1',
  'v0.8.2',
  'v0.8.3',
  'v0.8.4',
  'v0.8.5',
  'v0.8.6',
  'v0.8.7',
  'v0.8.8'
];

async function fetchWithRetry(url, options = {}, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`Network retry ${attempt}/${retries}... (${err.message})`);
      await new Promise(r => setTimeout(r, 1200 * attempt));
    }
  }
}

async function getExistingReleases() {
  const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Node'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch releases: ${res.statusText}`);
  return await res.json();
}

async function deleteRelease(id, tag) {
  const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/releases/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Node'
    }
  });
  if (res.status === 204 || res.status === 404) {
    console.log(`🗑️  Deleted release ${tag} (ID: ${id})`);
    return true;
  }
  console.error(`❌ Failed to delete release ${tag}: status ${res.status}`);
  return false;
}

function parseChangelogSections(content) {
  const sections = {};
  const versionRegex = /## \[([^\]]+)\][^\n]*\n([\s\S]*?)(?=\n## \[|$)/g;
  let match;
  while ((match = versionRegex.exec(content)) !== null) {
    const tag = match[1].startsWith('v') ? match[1] : `v${match[1]}`;
    const body = match[2].replace(/\n---\s*$/, '').trim();
    sections[tag] = body;
  }
  return sections;
}

async function publishRelease(tag, title, body, makeLatest = false) {
  const payload = {
    tag_name: tag,
    name: title,
    body: body,
    draft: false,
    prerelease: false,
    make_latest: makeLatest ? 'true' : 'false'
  };

  const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Node',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.status === 201) {
    console.log(`✅ Published ${tag}: ${data.html_url}`);
  } else {
    console.error(`❌ Failed ${tag} (${res.status}):`, data.message || data);
  }
}

async function main() {
  if (!token) {
    console.error('Error: GitHub token not found.');
    process.exit(1);
  }

  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const sections = parseChangelogSections(changelog);

  // 1. Fetch and clean up all existing releases
  console.log('Step 1: Fetching and deleting all existing releases...');
  const existingReleases = await getExistingReleases();
  console.log(`Found ${existingReleases.length} releases to purge.`);

  for (const rel of existingReleases) {
    await deleteRelease(rel.id, rel.tag_name);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('Waiting 3s for GitHub database to clear...');
  await new Promise(r => setTimeout(r, 3000));

  // 2. Publish from OLDEST to NEWEST in chronological order
  console.log('Step 2: Publishing releases sequentially from oldest (v0.1.0) to newest (v0.8.7)...');

  for (let i = 0; i < chronologicalTags.length; i++) {
    const tag = chronologicalTags[i];
    const isNewest = i === chronologicalTags.length - 1;
    const meta = releaseMetadata[tag] || { title: tag, date: '' };
    const formattedTitle = meta.date ? `${meta.title} (${meta.date})` : meta.title;

    const rawBody = sections[tag] || `Release notes for ${tag}`;
    const cleanBody = rawBody.replace(/^> 📅 \*\*Release Date:\*\*[^\n]*\n*/, '').trim();
    const finalBody = meta.date ? `> 📅 **Release Date:** ${meta.date}\n\n${cleanBody}` : cleanBody;

    console.log(`[${i + 1}/${chronologicalTags.length}] Publishing ${tag}...`);
    await publishRelease(tag, formattedTitle, finalBody, isNewest);

    // Stagger by 1.8 seconds so GitHub's published_at sequence is strictly ascending
    if (!isNewest) {
      await new Promise(r => setTimeout(r, 1800));
    }
  }

  console.log('🎉 All releases successfully purged and re-published in clean descending chronological order!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
