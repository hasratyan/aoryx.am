
const https = require('https');
const dns = require('dns');
const { execSync } = require('child_process');

const endpoints = [
  { name: 'OIDC Config', url: 'https://accounts.google.com/.well-known/openid-configuration' },
  { name: 'Certs v3 (googleapis)', url: 'https://www.googleapis.com/oauth2/v3/certs' },
  { name: 'Certs v1 (googleapis)', url: 'https://www.googleapis.com/oauth2/v1/certs' },
  { name: 'Certs (oauth2 domain)', url: 'https://oauth2.googleapis.com/certs' },
  { name: 'Token (POST-only)', url: 'https://oauth2.googleapis.com/token' },
];

async function checkUrl(url, forceIPv4 = false) {
  return new Promise((resolve) => {
    const options = {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      family: forceIPv4 ? 4 : undefined
    };

    const start = Date.now();
    const req = https.get(url, options, (res) => {
      const duration = Date.now() - start;
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          duration,
          body: body.slice(0, 100)
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        error: err.message,
        duration: Date.now() - start
      });
    });
    req.end();
  });
}

async function run() {
  console.log('--- Google API Connectivity Diagnostic v3 ---');
  
  for (const ep of endpoints) {
    console.log(`\nEndpoint: ${ep.name} (${ep.url})`);
    
    // Test default (v6/v4)
    const resDefault = await checkUrl(ep.url);
    if (resDefault.error) {
      console.log(`  [ERR] Default: ${resDefault.error} (${resDefault.duration}ms)`);
    } else {
      console.log(`  [${resDefault.status}] Default: ${resDefault.duration}ms`);
      if (resDefault.status === 403) {
        console.log(`    Body: ${resDefault.body.replace(/\n/g, ' ')}...`);
      }
    }

    // Test IPv4 only
    const resIPv4 = await checkUrl(ep.url, true);
    if (resIPv4.error) {
      console.log(`  [ERR] IPv4 only: ${resIPv4.error} (${resIPv4.duration}ms)`);
    } else {
      console.log(`  [${resIPv4.status}] IPv4 only: ${resIPv4.duration}ms`);
    }
  }

  console.log('\n--- Diagnostic Complete ---');
}

run();
