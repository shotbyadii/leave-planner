import fs from 'fs';
import path from 'path';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  
  // Fallback to local antigravity mcp configuration if available
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

const releaseTitles = {
  'v0.8.7': 'v0.8.7 - Modular Domain Architecture, Bottom-Up Morphing & Tracker Scroll Isolation',
  'v0.8.6': 'v0.8.6 - Smart Notification Suite, Attendance Catch-Up Actions & LOP Fallback',
  'v0.8.5': 'v0.8.5 - Multi-Card Attendance Carousel, Focused Month Carousel & Tactile Haptics',
  'v0.8.4': 'v0.8.4 - Multi-Day Attendance Catch-Up Cards, Mobile AI Settings & Error Reporting',
  'v0.8.3': 'v0.8.3 - Desktop Header Redesign, Mobile Leave Duration & UI Polish',
  'v0.8.2': 'v0.8.2 - Dynamic Vacation Policies, Push Notification & PWA Branding',
  'v0.8.1': 'v0.8.1 - PWA & Standalone Support, Interactive Sandbox & Apple Quota Ticker',
  'v0.8.0': 'v0.8.0 - Skeleton Loader, Seamless Calendar Switching & Mobile Modal Morphing',
  'v0.7.1': 'v0.7.1 - Mobile Hint Docking, Tutorial Highlighting & In-Memory Sandbox',
  'v0.6.0': 'v0.6.0 - Multimodal AI Public Holidays Manager with Google Gemini',
  'v0.5.0': 'v0.5.0 - Interactive 4-Step Onboarding, Dynamic Quota Shortforms & 52px Cells',
  'v0.4.0': 'v0.4.0 - iPadOS Dual-Pane Settings, Smart Search & Automatic Brand Scraper',
  'v0.3.0': 'v0.3.0 - Authentication & Cloud Sync Gateway, Supabase RLS Schema Isolation',
  'v0.2.0': 'v0.2.0 - WFH Monthly Quota Tracker & 12 PM Attendance Check-in Modal',
  'v0.1.0': 'v0.1.0 - Initial Leave Planner Core & Yearly Grid Selection'
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
  const list = await res.json();
  return new Set(list.map(r => r.tag_name));
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

async function publishRelease(tag, title, body) {
  const payload = {
    tag_name: tag,
    name: title,
    body: body,
    draft: false,
    prerelease: false
  };

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
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
    console.error('Error: GITHUB_TOKEN environment variable is not set and could not be discovered.');
    process.exit(1);
  }

  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const sections = parseChangelogSections(changelog);
  const existingTags = await getExistingReleases();

  console.log(`Found ${existingTags.size} existing GitHub releases.`);

  const tagsToPublish = Object.keys(releaseTitles);
  for (const tag of tagsToPublish) {
    if (existingTags.has(tag)) {
      console.log(`⏩ ${tag} already published as GitHub release.`);
      continue;
    }

    const title = releaseTitles[tag] || tag;
    const body = sections[tag] || `Release notes for ${tag}`;
    console.log(`Publishing release for ${tag}...`);
    await publishRelease(tag, title, body);
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('🎉 Finished publishing all releases.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
