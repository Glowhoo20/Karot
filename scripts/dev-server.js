#!/usr/bin/env node

/**
 * Development server script
 * Tries Python first, falls back to Node.js http-server
 */

const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PORT = 8000;

// Check if Python is available
async function checkPython() {
    try {
        const { stdout } = await execAsync('python --version');
        console.log(`[Dev] Python bulundu: ${stdout.trim()}`);
        return true;
    } catch (e) {
        try {
            const { stdout } = await execAsync('python3 --version');
            console.log(`[Dev] Python3 bulundu: ${stdout.trim()}`);
            return true;
        } catch (e2) {
            return false;
        }
    }
}

// Start Python server
function startPython() {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    console.log(`[Dev] Python HTTP server başlatılıyor (port ${PORT})...`);

    const server = spawn(pythonCmd, ['-m', 'http.server', PORT.toString()], {
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });

    server.on('error', (err) => {
        console.error('[Dev] Python server hatası:', err);
        console.log('[Dev] Node.js http-server deneniyor...');
        startNodeServer();
    });

    process.on('SIGINT', () => {
        server.kill();
        process.exit(0);
    });
}

// Start Node.js http-server
function startNodeServer() {
    console.log(`[Dev] Node.js http-server başlatılıyor (port ${PORT})...`);

    // Try to use local http-server first, then global
    const httpServer = spawn('npx', ['http-server', '-p', PORT.toString(), '-c-1'], {
        stdio: 'inherit',
        shell: true
    });

    httpServer.on('error', (err) => {
        console.error('[Dev] http-server bulunamadı!');
        console.error('[Dev] Lütfen şu komutlardan birini çalıştırın:');
        console.error('  npm install -g http-server');
        console.error('  veya');
        console.error('  npx http-server -p 8000');
        process.exit(1);
    });

    process.on('SIGINT', () => {
        httpServer.kill();
        process.exit(0);
    });
}

// Main
(async () => {
    console.log('[Dev] Geliştirme sunucusu başlatılıyor...\n');

    const hasPython = await checkPython();

    if (hasPython) {
        startPython();
    } else {
        console.log('[Dev] Python bulunamadı, Node.js http-server kullanılıyor...');
        startNodeServer();
    }
})();

