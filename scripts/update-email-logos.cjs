const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const emailLogoBuf = fs.readFileSync(path.join(projectRoot, 'public', 'logo-email.png'));
const emailLogoDataUri = `data:image/png;base64,${emailLogoBuf.toString('base64')}`;

const templatesDir = path.join(projectRoot, 'src', 'templates', 'emails');
const files = ['confirm-signup.html', 'magic-link.html', 'reset-password.html'];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Update brand-icon-box CSS
  html = html.replace(
    /\.brand-icon-box \{[\s\S]*?box-shadow:[^}]+;[\s\S]*?\}/,
    `.brand-icon-box {
      width: 40px;
      height: 40px;
      background: #ffffff;
      border: 1px solid #27272a;
      border-radius: 12px;
      text-align: center;
      vertical-align: middle;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
      overflow: hidden;
    }`
  );

  // 2. Replace brand icon inside brand-table
  html = html.replace(
    /<div class="brand-icon-box">[\s\S]*?<\/div>/,
    `<div class="brand-icon-box">
              <img src="${emailLogoDataUri}" width="36" height="36" alt="Leave Vault" style="display: block; width: 36px; height: 36px; object-fit: contain; margin: 2px auto; border-radius: 8px;" />
            </div>`
  );

  // 3. Replace brand-title with LEAVE VAULT
  html = html.replace(/<span class="brand-title">LEAVE PLANNER<\/span>/g, '<span class="brand-title">LEAVE VAULT</span>');

  // 4. Replace Hero Emblem with the official Logo Emblem
  html = html.replace(
    /<div class="hero-badge-wrap">[\s\S]*?<\/div>(\s*<!-- Hero Heading)/,
    `<div class="hero-badge-wrap">
        <div style="display: inline-block; padding: 12px; background: #ffffff; border: 1px solid #27272a; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <img src="${emailLogoDataUri}" width="60" height="60" alt="Leave Vault" style="display: block; width: 60px; height: 60px; object-fit: contain; border-radius: 12px;" />
        </div>
      </div>$1`
  );

  // 5. Update footer brand text
  html = html.replace(/<span class="footer-brand">LEAVE PLANNER<\/span>/g, '<span class="footer-brand">LEAVE VAULT</span>');
  html = html.replace(/<span class="footer-brand">Leave Planner<\/span>/g, '<span class="footer-brand">Leave Vault</span>');

  fs.writeFileSync(filePath, html);
  console.log(`Updated ${file} with official Leave Vault logo!`);
}
