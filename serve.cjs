// Optional dependency-free local server for playing on a phone over home Wi-Fi.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const lan = process.argv.includes('--lan');
const port = Number(process.env.PORT || 8080);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/game.js', ['game.js', 'text/javascript; charset=utf-8']],
  ['/assets/goblin.png', ['assets/goblin.png', 'image/png']]
]);
const server = http.createServer((req, res) => {
  const entry = files.get((req.url || '/').split('?')[0]);
  if (!entry || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(404);res.end('Not found');return;
  }
  fs.readFile(path.join(__dirname, entry[0]), (err, data) => {
    if (err) { res.writeHead(500);res.end('Game file unavailable');return; }
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('error', err => { console.error('Could not start Cache Goblin:', err.message);process.exitCode = 1; });
server.listen(port, lan ? '0.0.0.0' : '127.0.0.1', () => {
  const actualPort = server.address().port;
  console.log('Cache Goblin — The Crypt');
  console.log('Computer: http://localhost:' + actualPort);
  if (lan) {
    console.log('On a phone connected to the same Wi-Fi, open one of these addresses:');
    for (const list of Object.values(os.networkInterfaces())) for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) console.log('http://' + item.address + ':' + actualPort);
    }
  }
  console.log('Keep this window open while playing. Press Ctrl+C to stop.');
});
