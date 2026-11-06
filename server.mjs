import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
const server = createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end();return;}
  try {
    const url = new URL(req.url,'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root,'.'+(pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root)) {res.writeHead(403).end();return;}
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Страница не найдена');}
});
server.on('error', error => {console.error(error.code === 'EADDRINUSE' ? `Порт ${port} занят. Запустите с PORT=4174 npm start` : error.message);process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.log(`ПИРСBET → http://127.0.0.1:${port}\nТолько на этом компьютере. Для остановки: Ctrl+C.`));
