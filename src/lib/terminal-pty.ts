import { Server } from 'ws';
import { spawn as ptySpawn } from 'node-pty';
import { spawn } from 'child_process';
import { Server as HttpServer } from 'http';

interface TerminalSession {
    ptyProcess: any;
    containerId: string;
    lastActivity: number;
}

const sessions = new Map<string, TerminalSession>();

// Cleanup inactive sessions every minute
setInterval(() => {
    const now = Date.now();
    const TIMEOUT = 10 * 60 * 1000; // 10 minutes

    for (const [id, session] of sessions.entries()) {
        if (now - session.lastActivity > TIMEOUT) {
            console.log(`[PTY] 🧹 Cleaning up inactive session: ${id}`);
            session.ptyProcess.kill();
            spawn('docker', ['stop', session.containerId]);
            sessions.delete(id);
        }
    }
}, 60 * 1000);

export function setupTerminalWebSocket(server: HttpServer) {
    const wss = new Server({
        server,
        path: '/terminal'
    });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const userId = url.searchParams.get('userId') || '';

        const sessionId = Math.random().toString(36).substring(7);
        console.log(`[PTY] 🆕 New terminal session: ${sessionId} (User: ${userId || 'anonymous'})`);

        // Start isolated agent container
        const containerName = `agent-sandbox-${sessionId}`;

        const startContainer = spawn('docker', [
            'run',
            '--rm',
            '--name', containerName,
            '-d',
            '--memory', '512m',
            '--cpus', '0.5',
            '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges',
            '--pids-limit', '64',
            '-e', `AGENT_PRIVATE_KEY=${process.env.DEPLOYER_PRIVATE_KEY}`,
            '-e', `API_BASE_URL=http://host.docker.internal:3000`,
            '-e', `PLATFORM_USER_ID=${userId}`, // [NEW] Pass user ID to agent
            '--add-host=host.docker.internal:host-gateway',
            'agent-sandbox:latest'
        ]);

        let containerId = '';

        startContainer.stdout.on('data', (data) => {
            containerId = data.toString().trim();
            console.log(`[PTY] ✅ Container started: ${containerId.substring(0, 12)}`);

            // Use node-pty to spawn docker exec -it
            // This provides a real terminal environment with echo and job control
            const ptyProcess = ptySpawn('docker', [
                'exec',
                '-it',
                containerId,
                'sh',
                '-c',
                'cd /home/agent/easy-ai-agent && npm start'
            ], {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: process.cwd(),
                env: process.env as any
            });

            const session: TerminalSession = {
                ptyProcess,
                containerId,
                lastActivity: Date.now()
            };
            sessions.set(sessionId, session);
            console.log(`[PTY] 🚀 Agent auto-started for session ${sessionId}, PID: ${ptyProcess.pid}`);

            // PTY → WebSocket
            ptyProcess.onData((data) => {
                try {
                    ws.send(JSON.stringify({ type: 'data', data }));
                    session.lastActivity = Date.now();
                } catch (e) {
                    console.error('[PTY] ❌ Error sending data:', e);
                }
            });

            ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`[PTY] 🛑 Agent process exited - Code: ${exitCode}, Signal: ${signal}`);
                try {
                    ws.send(JSON.stringify({ type: 'exit', exitCode }));
                } catch (e) {
                    // Ignore if WS is already closed
                }
                spawn('docker', ['stop', containerId]);
                ws.close();
                sessions.delete(sessionId);
            });

            // WebSocket → PTY
            ws.on('message', (msg) => {
                try {
                    const message = JSON.parse(msg.toString());
                    if (!session) return;
                    session.lastActivity = Date.now();

                    if (message.type === 'data') {
                        ptyProcess.write(message.data);
                    } else if (message.type === 'resize') {
                        ptyProcess.resize(message.cols, message.rows);
                    }
                } catch (e) {
                    console.error('[PTY] ❌ Error processing message:', e);
                }
            });

            // Send startup notice
            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'data',
                    data: '\x1b[1;32m🤖 HighStation Agent Sandbox\x1b[0m\r\n' +
                        '\x1b[90mInitializing Secure Sandbox...\x1b[0m\r\n'
                }));
            }, 200);

            setTimeout(() => {
                ws.send(JSON.stringify({
                    type: 'data',
                    data: '\x1b[90mSandbox Ready. Launching Easy AI Agent...\x1b[0m\r\n\r\n'
                }));
            }, 1500);
        });

        startContainer.stderr.on('data', (data) => {
            console.error('[PTY] ❌ Docker start error:', data.toString());
            ws.send(JSON.stringify({
                type: 'data',
                data: `\r\n\x1b[31mError starting sandbox: ${data.toString()}\x1b[0m\r\n`
            }));
            ws.close();
        });

        ws.on('close', () => {
            console.log(`[PTY] 🔌 WebSocket closed for session: ${sessionId}`);
            const session = sessions.get(sessionId);
            if (session) {
                try {
                    session.ptyProcess.kill();
                } catch (e) { }
                spawn('docker', ['stop', session.containerId]);
                sessions.delete(sessionId);
            }
        });
    });

    console.log('[PTY] Real Terminal WebSocket server initialized (node-pty + Docker)');
}
