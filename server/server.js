// A simple Node.js server to serve the static files
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8008;
// Use 0.0.0.0 to listen on all network interfaces (needed for external access)
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Define base directories
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(__dirname, '..', 'src');
const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const COMPONENTS_DIR = path.join(__dirname, '..', 'src', 'components');
const STYLES_DIR = path.join(__dirname, '..', 'src', 'styles');
const JS_DIR = path.join(__dirname, '..', 'src', 'js');
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const server = http.createServer((req, res) => {
  console.log(`Request for ${req.url}`);
  
  // Handle the root path
  let filePath;
  if (req.url === '/') {
    filePath = path.join(ROOT_DIR, 'index.html');
  } else {
    // Remove leading slash if present and any query parameters
    const urlPath = req.url.split('?')[0].replace(/^\//, '');
    
    // First try the built files
    filePath = path.join(ROOT_DIR, urlPath);
    
    // If file doesn't exist in root, try src directory
    if (!fs.existsSync(filePath)) {
      const srcPath = path.join(ROOT_DIR, 'src', urlPath);
      if (fs.existsSync(srcPath)) {
        filePath = srcPath;
      }
    }
  }
  
  const extname = path.extname(filePath);
  let contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Page not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Page not found', 'utf-8');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`To access from other devices on your network, use your computer's IP address: http://YOUR_IP_ADDRESS:${PORT}/`);
  console.log('Press Ctrl+C to stop the server');
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after timeout
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 3000);
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown); // Ctrl+C
process.on('SIGTERM', gracefulShutdown); // kill command 