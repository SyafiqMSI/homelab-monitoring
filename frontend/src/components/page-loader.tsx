import { Server } from "lucide-react";

export function PageLoader() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm support-[backdrop-filter]:bg-background/80">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 -m-4 rounded-full bg-primary/20 blur-xl animate-pulse" />

                    {/* Icon container */}
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl ring-1 ring-white/10">
                        <Server className="h-10 w-10 text-white" />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
                        Homelab
                    </h2>
                    <div className="flex gap-1.5 grayscale opacity-60">
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
