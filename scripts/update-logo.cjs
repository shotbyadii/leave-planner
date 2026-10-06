const fs = require('fs');
const path = require('path');

const srcPath = 'C:/Users/anush/.gemini/antigravity/brain/2b74c4dc-2d92-45bb-9d82-9672504114f3/.user_uploaded/media_1791277981475.png';
const projectRoot = path.resolve(__dirname, '..');

// 1. Copy original PNG to all key icon locations
fs.copyFileSync(srcPath, path.join(projectRoot, 'public', 'logo.png'));
fs.copyFileSync(srcPath, path.join(projectRoot, 'public', 'app-icon-512.png'));
fs.copyFileSync(srcPath, path.join(projectRoot, 'public', 'app-icon-192.png'));
fs.copyFileSync(srcPath, path.join(projectRoot, 'public', 'apple-touch-icon.png'));
fs.copyFileSync(srcPath, path.join(projectRoot, 'src', 'assets', 'logo.png'));

// 2. Generate favicon.svg embedding the PNG data URI
const pngBuf = fs.readFileSync(path.join(projectRoot, 'public', 'logo.png'));
const b64 = pngBuf.toString('base64');
const dataUri = `data:image/png;base64,${b64}`;

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 694 694" width="100%" height="100%">
  <image href="${dataUri}" width="694" height="694" preserveAspectRatio="xMidYMid meet" />
</svg>
`;
fs.writeFileSync(path.join(projectRoot, 'public', 'favicon.svg'), svgContent);

console.log('Successfully updated logo and favicon.svg!');
