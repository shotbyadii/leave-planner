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

if (!token) {
  console.error('❌ GitHub token not found. Skipping release publishing.');
  process.exit(0);
}

// 1. Read current version from package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const currentVersion = pkg.version;
const currentTag = `v${currentVersion}`;

// 2. Extract release notes from CHANGELOG.md for this version
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const versionHeader = `## [${currentTag}]`;
const startIndex = changelog.indexOf(versionHeader);

let releaseBody = '';
if (startIndex !== -1) {
  const contentAfterHeader = changelog.slice(startIndex);
  const nextHeaderMatch = contentAfterHeader.slice(versionHeader.length).search(/\n## \[v\d+\.\d+\.\d+\]/);
  if (nextHeaderMatch !== -1) {
    releaseBody = contentAfterHeader.slice(0, versionHeader.length + nextHeaderMatch).trim();
  } else {
    releaseBody = contentAfterHeader.trim();
  }
} else {
  releaseBody = `Release ${currentTag}`;
}

async function publishLatestRelease() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'leave-planner-release-publisher'
  };

  // Check if this release already exists
  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${currentTag}`, { headers });
  
  if (checkRes.status === 200) {
    const existing = await checkRes.json();
    console.log(`ℹ️  Release ${currentTag} already exists on GitHub (ID: ${existing.id}).`);
    
    // Update release notes if body has changed
    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${existing.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${currentTag} - Leave Vault`,
        body: releaseBody
      })
    });
    if (updateRes.ok) {
      console.log(`✅ Updated release notes for ${currentTag}: https://github.com/${owner}/${repo}/releases/tag/${currentTag}`);
    }
    return;
  }

  // Create new release
  console.log(`🚀 Publishing new release ${currentTag}...`);
  const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: currentTag,
      name: `${currentTag} - Leave Vault`,
      body: releaseBody,
      draft: false,
      prerelease: false
    })
  });

  if (createRes.ok) {
    const data = await createRes.json();
    console.log(`🎉 Published ${currentTag}: ${data.html_url}`);
  } else {
    const err = await createRes.text();
    console.error(`❌ Failed to publish ${currentTag}:`, err);
  }
}

publishLatestRelease().catch(err => {
  console.error('Unexpected error publishing release:', err);
});
