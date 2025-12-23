
const https = require('https');
const { execSync } = require('child_process');
const dns = require('dns');

const urls = [
  { name: 'OIDC Config', url: 'https://accounts.google.com/.well-known/openid-configuration' },
  { name: 'Certs (v3) - No UA', url: 'https://www.googleapis.com/oauth2/v3/certs', ua: false },
  { name: 'Certs (v3) - With UA', url: 'https://www.googleapis.com/oauth2/v3/certs', ua: true },
  { name: 'Certs (v2) - No UA', url: 'https://accounts.google.com/o/oauth2/v2/certs', ua: false },
  { name: 'Certs (v2) - With UA', url: 'https://accounts.google.com/o/oauth2/v2/certs', ua: true },
  { name: 'Token (POST-only)', url: 'https://oauth2.googleapis.com/token', ua: true },
  { name: 'Userinfo', url: 'https://www.googleapis.com/oauth2/v3/userinfo', ua: true }
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

console.log('--- Google API Advanced Diagnostic ---');
console.log('Testing connectivity, User-Agent impact, and alternative endpoints...\n');

async function checkUrl(item) {
  return new Promise((resolve) => {
    const options = {};
    if (item.ua) {
      options.headers = { 'User-Agent': USER_AGENT };
    }

    const start = Date.now();
    const req = https.get(item.url, options, (res) => {
      const duration = Date.now() - start;
      console.log(`[${res.statusCode}] ${item.name.padEnd(25)}: ${duration}ms`);
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 403) {
          console.log(`   ! 403 Body (first 100 chars): ${data.trim().slice(0, 100).replace(/\n/g, ' ')}...`);
        }
        resolve(true);
      });
    });

    req.on('error', (err) => {
      console.log(`[FAIL] ${item.name.padEnd(25)}: ${err.message}`);
      resolve(false);
    });
    req.end();
  });
}

async function run() {
  // DNS Check
  console.log('--- DNS Resolution ---');
  await new Promise(resolve => {
    dns.lookup('www.googleapis.com', { all: true }, (err, addresses) => {
      if (err) console.log('www.googleapis.com lookup failed:', err.message);
      else console.log('www.googleapis.com resolved to:', addresses.map(a => `${a.address} (${a.family === 4 ? 'IPv4' : 'IPv6'})`).join(', '));
      resolve();
    });
  });

  await new Promise(resolve => {
    dns.lookup('accounts.google.com', { all: true }, (err, addresses) => {
      if (err) console.log('accounts.google.com lookup failed:', err.message);
      else console.log('accounts.google.com resolved to:', addresses.map(a => `${a.address} (${a.family === 4 ? 'IPv4' : 'IPv6'})`).join(', '));
      resolve();
    });
  });
  console.log('');

  // Connectivity Check
  console.log('--- Connectivity & Endpoint Test ---');
  for (const item of urls) {
    await checkUrl(item);
  }

  console.log('\n--- Environment Check ---');
  console.log('Node version:', process.version);
  console.log('Platform:', process.platform);
  
  try {
    const curlCheck = execSync('curl -I -s https://www.googleapis.com/oauth2/v3/certs').toString();
    console.log('Curl check (first line):', curlCheck.split('\n')[0]);
  } catch (e) {
    console.log('Curl not available or failed');
  }

  console.log('\n--- Recommendations ---');
  console.log('1. If "With UA" works but "No UA" fails (403), we need to set a User-Agent in NextAuth.');
  console.log('2. If "Certs (v2)" works but "Certs (v3)" fails, we can try switching to the v2 endpoint.');
  console.log('3. If IPv6 is present and all fail, consider forcing IPv4.');
  console.log('\nDiagnostic Complete.');
}

run();
