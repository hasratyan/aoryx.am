
const https = require('https');

const urls = [
  'https://accounts.google.com/.well-known/openid-configuration',
  'https://www.googleapis.com/oauth2/v3/certs',
  'https://oauth2.googleapis.com/token',
  'https://www.googleapis.com/oauth2/v3/userinfo'
];

console.log('--- Google API Connectivity Diagnostic ---');
console.log('Checking if your server can reach Google OAuth endpoints...\n');

async function checkUrl(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(url, (res) => {
      const duration = Date.now() - start;
      console.log(`[${res.statusCode}] ${url} (${duration}ms)`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 403) {
          console.log(`   ! Forbidden: ${data.slice(0, 200)}...`);
        }
        resolve(true);
      });
    }).on('error', (err) => {
      console.log(`[FAIL] ${url}`);
      console.log(`   ! Error: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  for (const url of urls) {
    await checkUrl(url);
  }
  console.log('\n--- Diagnostic Complete ---');
  console.log('If you see [FAIL] or many 403s, your server IP might be restricted or you have a firewall issue.');
  console.log('If all are 200 or 404/405 (for POST-only endpoints), connectivity is fine.');
}

run();
