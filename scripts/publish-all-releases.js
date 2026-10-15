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
  'v0.8.7': { title: 'v0.8.7 - Modular Domain Architecture, Bottom-Up Morphing & Tracker Scroll Isolation', date: 'October 16, 2026' },
  'v0.8.6': { title: 'v0.8.6 - Smart Notification Suite, Attendance Catch-Up Actions & LOP Fallback', date: 'October 16, 2026' },
  'v0.8.5': { title: 'v0.8.5 - Multi-Card Attendance Carousel, Focused Month Carousel & Tactile Haptics', date: 'October 14, 2026' },
  'v0.8.4': { title: 'v0.8.4 - Multi-Day Attendance Catch-Up Cards, Mobile AI Settings & Error Reporting', date: 'October 12, 2026' },
  'v0.8.3': { title: 'v0.8.3 - Desktop Header Redesign, Mobile Leave Duration & UI Polish', date: 'October 12, 2026' },
  'v0.8.2': { title: 'v0.8.2 - Dynamic Vacation Policies, Push Notification & PWA Branding', date: 'September 15, 2026' },
  'v0.8.1': { title: 'v0.8.1 - PWA & Standalone Support, Interactive Sandbox & Apple Quota Ticker', date: 'August 22, 2026' },
  'v0.8.0': { title: 'v0.8.0 - Skeleton Loader, Seamless Calendar Switching & Mobile Modal Morphing', date: 'August 17, 2026' },
  'v0.7.1': { title: 'v0.7.1 - Mobile Hint Docking, Tutorial Highlighting & In-Memory Sandbox', date: 'August 16, 2026' },
  'v0.6.0': { title: 'v0.6.0 - Multimodal AI Public Holidays Manager with Google Gemini', date: 'August 16, 2026' },
  'v0.5.0': { title: 'v0.5.0 - Interactive 4-Step Onboarding, Dynamic Quota Shortforms & 52px Cells', date: 'August 3, 2026' },
  'v0.4.0': { title: 'v0.4.0 - iPadOS Dual-Pane Settings, Smart Search & Automatic Brand Scraper', date: 'August 1, 2026' },
  'v0.3.0': { title: 'v0.3.0 - Authentication & Cloud Sync Gateway, Supabase RLS Schema Isolation', date: 'July 28, 2026' },
  'v0.2.0': { title: 'v0.2.0 - WFH Monthly Quota Tracker & 12 PM Attendance Check-in Modal', date: 'July 24, 2026' },
  'v0.1.0': { title: 'v0.1.0 - Initial Leave Planner Core & Yearly Grid Selection', date: 'May 15, 2026' }
};

async function getExistingReleases() {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Node'
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch releases: ${res.statusText}`);
  return await res.json();
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

async function updateRelease(id, tag, titleWithDate, fullBody) {
  const payload = {
    name: titleWithDate,
    body: fullBody
  };

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'Node',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (res.status === 200) {
    console.log(`✅ Updated ${tag} with date badge: ${titleWithDate}`);
  } else {
    console.error(`❌ Failed updating ${tag}:`, data.message || data);
  }
}

async function main() {
  if (!token) {
    console.error('Error: GitHub token not found.');
    process.exit(1);
  }

  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const sections = parseChangelogSections(changelog);
  const releasesList = await getExistingReleases();

  console.log(`Synchronizing dates across ${releasesList.length} releases...`);

  for (const rel of releasesList) {
    const meta = releaseMetadata[rel.tag_name];
    if (!meta) continue;

    const formattedTitle = `${meta.title} (${meta.date})`;
    const rawBody = sections[rel.tag_name] || rel.body || '';
    
    // Ensure clean badge at the top
    const cleanBody = rawBody.replace(/^> 📅 \*\*Original Release Date:\*\*[^\n]*\n*/, '').trim();
    const finalBody = `> 📅 **Release Date:** ${meta.date}\n\n${cleanBody}`;

    await updateRelease(rel.id, rel.tag_name, formattedTitle, finalBody);
    await new Promise(r => setTimeout(r, 400));
  }

  console.log('🎉 All releases updated with accurate date badges and titles.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
