import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const token = env.match(/^SUPABASE_ACCESS_TOKEN=["']?([^"'\r\n]+)/m)[1];
const ref = env.match(/^SUPABASE_PROJECT_REF=["']?([^"'\r\n]+)/m)?.[1] || 'vyuiuhlzxjeqwzhwocbg';

async function deploy() {
  const indexTsContent = fs.readFileSync('supabase/functions/send-push/index.ts', 'utf8');

  const metadata = {
    name: 'send-push',
    entrypoint_path: 'index.ts',
    verify_jwt: false
  };

  const formData = new FormData();
  formData.append('metadata', JSON.stringify(metadata));
  formData.append('file', new Blob([indexTsContent], { type: 'text/plain' }), 'index.ts');

  console.log(`🚀 Deploying send-push to Supabase [${ref}]...`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=send-push`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

deploy().catch(console.error);
