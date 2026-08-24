const https = require('https');
const options = {
  hostname: 'api.github.com',
  path: '/user',
  method: 'GET',
  headers: {
    'User-Agent': 'TikTokManager-Build',
    'Authorization': 'token zrJiY&gA3x4bsgBh'
  }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data.slice(0, 500)));
});
req.on('error', e => console.error('Error:', e.message));
req.end();
