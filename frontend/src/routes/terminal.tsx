import { getStoredToken } from "@/lib/api";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Terminal as TerminalIcon, Power, Trash2, Copy } from "lucide-react";

export const Route = createFileRoute("/terminal")({
    component: TerminalPage,
});

interface TerminalMessage {
    type: "input" | "output" | "error";
    data: string;
}

function TerminalPage() {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [content, setContent] = useState<string>(""); // Single content buffer
    const ws = useRef<WebSocket | null>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const hiddenInputRef = useRef<HTMLTextAreaElement>(null); // Hidden input for mobile/IME

    const scrollToBottom = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, []);

    const connect = useCallback(() => {
        // Prevent concurrent connection attempts
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return;

        const token = getStoredToken();
        if (!token) {
            toast.error("Not authenticated. Please login first.");
            return;
        }

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
        const cleanApiUrl = apiUrl.replace(/\/$/, ""); // Remove trailing slash
        const baseUrl = cleanApiUrl.replace("/api", "").replace("http://", "ws://").replace("https://", "wss://");
        const wsUrl = `${baseUrl}/ws/terminal?token=${token}`;

        console.log("Connecting to terminal WebSocket:", wsUrl);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            if (ws.current !== socket) return; // Ignore stale socket
            setIsConnected(true);
            toast.success("Terminal connected");
            hiddenInputRef.current?.focus();
        };

        socket.onmessage = (event) => {
            if (ws.current !== socket) return;
            try {
                const msg: TerminalMessage = JSON.parse(event.data);
                if (msg.type === "output" || msg.type === "error") {
                    setContent((prev) => {
                        let current = prev;
                        // Process characters one by one to handle backspaces
                        // PowerShell tends to send Backspace-Space-Backspace sequence
                        const data = msg.data;
                        for (let i = 0; i < data.length; i++) {
                            const char = data[i];
                            if (char === '\b') {
                                current = current.slice(0, -1);
                            } else {
                                current += char;
                            }
                        }
                        return current;
                    });
                    setTimeout(scrollToBottom, 5);
                }
            } catch {
                setContent((prev) => prev + event.data);
                scrollToBottom();
            }
        };

        socket.onclose = () => {
            if (ws.current === socket) setIsConnected(false);
        };

        socket.onerror = () => {
            if (ws.current !== socket) return;
            setIsConnected(false);
            console.error("WebSocket connection error");
            toast.error("Connection failed");
        };

        ws.current = socket;
    }, [scrollToBottom]);

    const disconnect = () => {
        if (ws.current) {
            ws.current.close();
            ws.current = null;
            setIsConnected(false);
            toast.info("Disconnected");
        }
    };

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            connect();
        }
        return () => {
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [authLoading, isAuthenticated, connect]);

    const sendInput = (input: string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            const msg: TerminalMessage = { type: "input", data: input };
            ws.current.send(JSON.stringify(msg));
        }
    };

    // Capture keystrokes directly
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isConnected) return;

        // Allow copy (Ctrl+C) via browser native selection if text selected, 
        // BUT if no selection, send Ctrl+C signal to terminal
        if (e.key === "c" && e.ctrlKey) {
            if (!window.getSelection()?.toString()) {
                sendInput("\x03"); // SIGINT
            }
            return; // Let browser handle copy if selection exists
        }

        // Prevent default actions for special browser keys key to avoid scrolling etc
        if (e.key === "Tab" || e.key === "Backspace" || e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
        }

        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            sendInput(e.key);
        } else if (e.key === "Enter") {
            sendInput("\n");
        } else if (e.key === "Backspace") {
            sendInput("\b");
        } else if (e.key === "Tab") {
            sendInput("\t");
        } else if (e.key === "ArrowUp") {
            sendInput("\x1b[A");
        } else if (e.key === "ArrowDown") {
            sendInput("\x1b[B");
        }

        hiddenInputRef.current?.focus();
    };

    const copyOutput = () => {
        navigator.clipboard.writeText(content);
        toast.success("Terminal output copied");
    };

    const parseAnsi = (text: string): React.ReactNode[] => {
        // Basic ANSI stripper/colorizer (Simplified for now)
        // For a real terminal, we'd use xterm.js, but here's a lightweight parser
        // To fix double-echo if server also echos, we might need filtering, 
        // but Windows pseudo-console is tricky. 
        // For now, local echo + server echo represents "double characters" issue potentially?
        // If you see "llss" instead of "ls", we remove local echo.
        // Given the previous issue was "not seeing text", local echo is safer.

        const parts: React.ReactNode[] = [];
        let remaining = text;
        let key = 0;

        // Split by simple logic or just render raw with some color replacement
        // This regex matches basic ANSI color codes like \u001b[32m
        const regex = /\x1b\[(\d+)m/;

        while (remaining) {
            const match = remaining.match(regex);
            if (!match || match.index === undefined) {
                parts.push(<span key={key++}>{remaining}</span>);
                break;
            }

            if (match.index > 0) {
                parts.push(<span key={key++}>{remaining.substring(0, match.index)}</span>);
            }

            // Simple 8-color map mapping
            const code = match[1];
            let className = "";
            if (code === "0") className = "text-gray-300"; // Reset
            else if (code === "31") className = "text-red-500";
            else if (code === "32") className = "text-emerald-500";
            else if (code === "33") className = "text-yellow-500";
            else if (code === "34") className = "text-blue-500";

            remaining = remaining.substring(match.index + match[0].length);

            // Find next code or end
            const nextMatch = remaining.match(regex);
            const end = nextMatch?.index ?? remaining.length;
            const textSegment = remaining.substring(0, end);

            parts.push(<span key={key++} className={className}>{textSegment}</span>);
            remaining = remaining.substring(end);
        }
        return parts;
    };

    const handleClear = () => {
        setContent("");
        if (isConnected) {
            // Send newline to trigger new prompt from shell
            sendInput("\n");
        }
        hiddenInputRef.current?.focus();
    };

    return (
        <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <TerminalIcon className="h-5 w-5" /> Terminal
                </h1>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={copyOutput} title="Copy Output">
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClear} title="Clear">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    {isConnected ? (
                        <Button variant="ghost" size="sm" onClick={disconnect} className="text-red-400 hover:text-red-300">
                            <Power className="h-4 w-4 mr-1" /> Stop
                        </Button>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={connect} className="text-emerald-400 hover:text-emerald-300">
                            <Power className="h-4 w-4 mr-1" /> Connect
                        </Button>
                    )}
                </div>
            </div>

            {/* Terminal Screen */}
            <Card className="flex-1 overflow-hidden border-2 border-muted/20 bg-black rounded-lg shadow-inner flex flex-col">
                <div
                    className="flex-1 p-4 font-mono text-sm text-gray-300 overflow-auto whitespace-pre-wrap outline-none"
                    ref={terminalRef}
                    onClick={() => hiddenInputRef.current?.focus()}
                    onKeyDown={handleKeyDown}
                    tabIndex={0} // Make div focusable for keys
                    style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace" }}
                >
                    {parseAnsi(content)}
                    {/* Blinking cursor effect */}
                    {isConnected && <span className="inline-block w-2 h-4 bg-gray-500 animate-pulse ml-0.5 align-middle"></span>}
                </div>

                {/* Hidden textarea to capture mobile input / IME if needed */}
                <textarea
                    ref={hiddenInputRef}
                    className="opacity-0 absolute h-0 w-0"
                    autoFocus
                    onKeyDown={handleKeyDown}
                />
            </Card>
        </div>
    );
}
