import { defineConfig, Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

function localFileStoragePlugin(): Plugin {
  const saveFilePath = path.resolve(__dirname, './save.json');

  const setupEndpoints = (server: any) => {
    server.middlewares.use('/api/save', (req: any, res: any, next: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            fs.writeFileSync(saveFilePath, body, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, path: saveFilePath }));
          } catch (err: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, message: err?.message || '写入失败' }));
          }
        });
        return;
      }
      next();
    });

    server.middlewares.use('/api/load', (req: any, res: any, next: any) => {
      if (req.method === 'GET') {
        try {
          if (fs.existsSync(saveFilePath)) {
            const content = fs.readFileSync(saveFilePath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(content);
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ notFound: true }));
          }
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ notFound: true, message: err?.message || '读取失败' }));
        }
        return;
      }
      next();
    });

    server.middlewares.use('/api/clear', (req: any, res: any, next: any) => {
      if (req.method === 'POST') {
        try {
          if (fs.existsSync(saveFilePath)) {
            fs.unlinkSync(saveFilePath);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, message: err?.message || '删除失败' }));
        }
        return;
      }
      next();
    });
  };

  return {
    name: 'local-file-storage',
    configureServer(server) {
      setupEndpoints(server);
    },
    configurePreviewServer(server) {
      setupEndpoints(server);
    }
  };
}

export default defineConfig({
  plugins: [localFileStoragePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
