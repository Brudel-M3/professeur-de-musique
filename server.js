const http = require('http');
const fs = require('fs');
const path = require('path');

const { LESSONS } = require('./course.js');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function safeResolveFile(filePath) {
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    return null;
  }
  return path.join(ROOT, normalized);
}

function serveStaticFile(req, res) {
  const requestPath = new URL(req.url, 'http://localhost').pathname;
  const safePath = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = safeResolveFile(safePath.replace(/^\//, ''));

  if (!filePath || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, status: 'healthy' });
      return;
    }

    if (url.pathname === '/api/lessons') {
      sendJson(res, 200, { lessons: LESSONS });
      return;
    }

    if (url.pathname === '/api/lesson') {
      const id = url.searchParams.get('id') || LESSONS[0].id;
      const lesson = LESSONS.find((entry) => entry.id === id) || LESSONS[0];
      sendJson(res, 200, { lesson });
      return;
    }

    serveStaticFile(req, res);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`Professeur de musique démarré sur http://localhost:${PORT}`);
  });
}

module.exports = {
  createServer,
  PORT,
  LESSONS
};
