import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5174;
const ROOT = '/workspace';

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ts': 'text/plain',
  '.tsx': 'text/plain',
  '.svg': 'image/svg+xml',
  '.zip': 'application/zip',
  '.md': 'text/plain',
  '.sh': 'text/plain',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (urlPath === '/index.html') {
    const files = listFiles(ROOT, ROOT);
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>项目文件下载</title>
<style>
body{font-family:-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;background:#f5f5f5}
h1{color:#1a56db}a{color:#1a56db;text-decoration:none}a:hover{text-decoration:underline}
.file{padding:8px 12px;margin:4px 0;background:#fff;border-radius:6px;display:flex;justify-content:space-between;align-items:center}
.file:hover{background:#eef2ff}
.dir{font-weight:bold;color:#374151}
.size{color:#9ca3af;font-size:14px}
.download{background:#1a56db;color:#fff;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;font-size:16px;margin:20px 0}
.download:hover{background:#1648b8}
</style></head><body>
<h1>项目文件下载</h1>
<a href="/download-zip"><button class="download">下载完整项目ZIP</button></a>
<a href="/download-dist-zip"><button class="download">下载网站文件ZIP（可直接部署）</button></a>
<hr>
${files}
</body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (urlPath === '/download-zip') {
    res.writeHead(302, { Location: '/wenchacha-full-project.zip' });
    res.end();
    return;
  }

  if (urlPath === '/download-dist-zip') {
    res.writeHead(302, { Location: '/wenchacha-website.zip' });
    res.end();
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const files = listFiles(filePath, filePath);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>${urlPath}</h1><a href="/">返回上级</a><hr>${files}`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

function listFiles(dir, root) {
  const items = fs.readdirSync(dir).filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist');
  return items.map(f => {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    const relPath = path.relative(root, fullPath);
    const urlPath = '/' + path.relative(ROOT, fullPath);
    if (stat.isDirectory()) {
      return `<div class="file"><a class="dir" href="${urlPath}">📁 ${f}/</a><span class="size">目录</span></div>`;
    }
    const size = stat.size > 1024 * 1024 ? (stat.size / 1024 / 1024).toFixed(1) + ' MB' : (stat.size / 1024).toFixed(1) + ' KB';
    return `<div class="file"><a href="${urlPath}">📄 ${f}</a><span class="size">${size}</span></div>`;
  }).join('');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`文件下载服务已启动: http://localhost:${PORT}/`);
});
