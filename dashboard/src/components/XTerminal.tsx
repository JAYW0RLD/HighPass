import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

interface TerminalProps {
    className?: string;
}

export default function XTerminal({ className = '' }: TerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const terminal = useRef<Terminal | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth(); // [NEW] Get current user

    useEffect(() => {
        if (!terminalRef.current) return;

        // ... existing terminal init code ...
        terminal.current = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
            theme: {
                background: '#0f172a',
                foreground: '#e2e8f0',
                cursor: '#10b981',
                black: '#1e293b',
                red: '#ef4444',
                green: '#10b981',
                yellow: '#f59e0b',
                blue: '#3b82f6',
                magenta: '#a855f7',
                cyan: '#06b6d4',
                white: '#cbd5e1',
                brightBlack: '#475569',
                brightRed: '#f87171',
                brightGreen: '#34d399',
                brightYellow: '#fbbf24',
                brightBlue: '#60a5fa',
                brightMagenta: '#c084fc',
                brightCyan: '#22d3ee',
                brightWhite: '#f1f5f9'
            },
            allowProposedApi: true
        });

        fitAddon.current = new FitAddon();
        terminal.current.loadAddon(fitAddon.current);
        terminal.current.loadAddon(new WebLinksAddon());

        terminal.current.open(terminalRef.current);
        fitAddon.current.fit();

        // Connect to WebSocket with userId for personalization
        // Use window.location.host to include port automatically (works with reverse proxies)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/terminal?userId=${user?.id || ''}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            setIsConnected(true);
            setError(null);
            terminal.current?.reset();
            console.log('[Terminal] WebSocket connected');
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'data' && terminal.current) {
                    terminal.current.write(message.data);
                } else if (message.type === 'exit') {
                    terminal.current?.writeln(`\r\n\x1b[33mProcess exited with code ${message.exitCode}\x1b[0m`);
                }
            } catch (e) {
                console.error('[Terminal] Error processing message:', e);
            }
        };

        ws.current.onerror = (error) => {
            console.error('[Terminal] WebSocket error:', error);
            setError('Connection error. Please refresh the page.');
        };

        ws.current.onclose = () => {
            setIsConnected(false);
            terminal.current?.writeln('\r\n\x1b[31mConnection closed\x1b[0m');
        };

        // Terminal → WebSocket
        terminal.current.onData((data) => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'data', data }));
            }
        });

        // Handle resize
        const handleResize = () => {
            if (fitAddon.current && terminal.current) {
                fitAddon.current.fit();
                if (ws.current?.readyState === WebSocket.OPEN) {
                    ws.current.send(JSON.stringify({
                        type: 'resize',
                        cols: terminal.current.cols,
                        rows: terminal.current.rows
                    }));
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            ws.current?.close();
            terminal.current?.dispose();
        };
    }, []);

    return (
        <div className={`relative ${className}`}>
            {error && (
                <div className="absolute top-4 left-4 right-4 bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg z-10">
                    {error}
                </div>
            )}
            {!isConnected && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
                    <div className="text-slate-400 flex items-center gap-3">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span>Connecting to terminal...</span>
                    </div>
                </div>
            )}
            <div ref={terminalRef} className="w-full h-full" />
        </div>
    );
}
