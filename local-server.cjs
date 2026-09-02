const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = __dirname;
const port = Number.parseInt(process.argv[2] || process.env.TYPE_IT_UP_PORT || '3991', 10);
const routes = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/Type%20It%20Up%20App.dc.html', ['Type It Up App.dc.html', 'text/html']],
  ['/support.js', ['support.js', 'text/javascript']],
  ['/project-format.js', ['project-format.js', 'text/javascript']],
  ['/favicon.ico', ['favicon.ico', 'image/x-icon']],
  ['/type-it-up-header-transparent-cropped.png', ['type-it-up-header-transparent-cropped.png', 'image/png']],
  ['/assets/machines/office-standard.png', ['assets/machines/office-standard.png', 'image/png']],
  ['/assets/machines/travel-portable.png', ['assets/machines/travel-portable.png', 'image/png']],
  ['/assets/fonts/CourierPrime-Regular.ttf', ['assets/fonts/CourierPrime-Regular.ttf', 'font/ttf']],
  ['/assets/fonts/CourierPrime-Bold.ttf', ['assets/fonts/CourierPrime-Bold.ttf', 'font/ttf']],
]);

http.createServer((request, response) => {
  const route = routes.get(request.url);
  if (!route) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  const [filename, mime] = route;
  response.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(path.join(root, filename)).pipe(response);
}).listen(port, '0.0.0.0');
