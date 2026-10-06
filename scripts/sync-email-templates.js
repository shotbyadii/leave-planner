import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const envPath = path.join(rootDir, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=["']?([^"'\\r\\n]+)["']?`, 'm'));
  return match ? match[1].trim() : process.env[key];
}

const accessToken = getEnv('SUPABASE_ACCESS_TOKEN');
const projectRef = getEnv('SUPABASE_PROJECT_REF') || 'vyuiuhlzxjeqwzhwocbg';

if (!accessToken) {
  console.error('❌ SUPABASE_ACCESS_TOKEN is missing in .env.local.');
  process.exit(1);
}

const templatesDir = path.join(rootDir, 'src', 'templates', 'emails');
const confirmSignupPath = path.join(templatesDir, 'confirm-signup.html');
const resetPasswordPath = path.join(templatesDir, 'reset-password.html');
const magicLinkPath = path.join(templatesDir, 'magic-link.html');

if (!fs.existsSync(confirmSignupPath) || !fs.existsSync(resetPasswordPath) || !fs.existsSync(magicLinkPath)) {
  console.error('❌ One or more template HTML files are missing in src/templates/emails.');
  process.exit(1);
}

// Read logo for dynamic injection into templates
const logoPath = path.join(rootDir, 'public', 'logo-email.png');
const appLogoBase64 = fs.existsSync(logoPath) 
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : '';

function prepareTemplate(htmlContent) {
  let processed = htmlContent;
  if (appLogoBase64) {
    // Replace any base64 png data URI inside <img> tags with current logo-email.png
    processed = processed.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, appLogoBase64);
  }
  return processed;
}

const confirmHtml = prepareTemplate(fs.readFileSync(confirmSignupPath, 'utf8'));
const resetHtml = prepareTemplate(fs.readFileSync(resetPasswordPath, 'utf8'));
const magicHtml = prepareTemplate(fs.readFileSync(magicLinkPath, 'utf8'));

console.log(`🚀 Syncing email templates to Supabase project [${projectRef}]...`);

async function syncTemplates() {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

  const payload = {
    mailer_subjects_confirmation: "Confirm your Leave Vault account",
    mailer_templates_confirmation_content: confirmHtml,

    mailer_subjects_recovery: "Reset your Leave Vault password",
    mailer_templates_recovery_content: resetHtml,

    mailer_subjects_magic_link: "Your Leave Vault magic login link",
    mailer_templates_magic_link_content: magicHtml,
  };

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Failed to update Supabase templates (HTTP ${response.status}):`, data);
      process.exit(1);
    }

    console.log('✅ Successfully synced email templates with Supabase!');
    console.log('   - Confirm Signup: Updated');
    console.log('   - Reset Password: Updated');
    console.log('   - Magic Link: Updated');
  } catch (err) {
    console.error('❌ Error calling Supabase Management API:', err);
    process.exit(1);
  }
}

syncTemplates();
