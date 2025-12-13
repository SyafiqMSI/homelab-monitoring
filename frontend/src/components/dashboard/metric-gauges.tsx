import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/api";
import { Cpu, MemoryStick, HardDrive, MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface CPUGaugeProps {
    usage: number;
    cores: number;
    modelName: string;
    frequency: number;
    perCoreUsage?: number[];
    className?: string;
}

export function CPUGauge({
    usage,
    cores,
    modelName,
    frequency,
    perCoreUsage = [],
    className,
}: CPUGaugeProps) {
    const getUsageColor = (value: number) => {
        if (value > 90) return "text-rose-500";
        if (value > 75) return "text-amber-500";
        if (value > 50) return "text-emerald-500";
        return "text-primary";
    };

    const getProgressColor = (value: number) => {
        if (value > 90) return "bg-rose-500";
        if (value > 75) return "bg-amber-500";
        if (value > 50) return "bg-emerald-500";
        return "bg-primary";
    };

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/10">
                        <Cpu className="h-4 w-4 text-cyan-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base">CPU</CardTitle>
                        <p className="text-xs text-muted-foreground truncate max-w-48">
                            {modelName || "Unknown CPU"}
                        </p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>View Processes</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-secondary"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${usage * 2.51} 251`}
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#06b6d4" />
                                    <stop offset="50%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-3xl font-bold", getUsageColor(usage))}>
                                {usage.toFixed(0)}%
                            </span>
                            <span className="text-xs text-muted-foreground">Usage</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-secondary/50">
                        <p className="text-muted-foreground text-xs">Cores</p>
                        <p className="font-semibold">{cores}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50">
                        <p className="text-muted-foreground text-xs">Frequency</p>
                        <p className="font-semibold">{(frequency / 1000).toFixed(2)} GHz</p>
                    </div>
                </div>
                {perCoreUsage.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Per Core Usage</p>
                        <div className="grid grid-cols-4 gap-1">
                            {perCoreUsage.slice(0, 8).map((coreUsage, i) => (
                                <div key={i} className="space-y-0.5">
                                    <div className="text-xs text-center text-muted-foreground">
                                        {i}
                                    </div>
                                    <Progress
                                        value={coreUsage}
                                        className="h-1"
                                        indicatorClassName={getProgressColor(coreUsage)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface MemoryGaugeProps {
    used: number;
    total: number;
    usedPercent: number;
    swapUsed?: number;
    swapTotal?: number;
    swapPercent?: number;
    className?: string;
}

export function MemoryGauge({
    used,
    total,
    usedPercent,
    swapUsed = 0,
    swapTotal = 0,
    swapPercent = 0,
    className,
}: MemoryGaugeProps) {
    const getUsageColor = (value: number) => {
        if (value > 90) return "text-rose-500";
        if (value > 75) return "text-amber-500";
        return "text-emerald-500";
    };

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10">
                        <MemoryStick className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Memory</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {formatBytes(used)} / {formatBytes(total)}
                        </p>
                    </div>
                </div>
                <Badge
                    variant={usedPercent > 90 ? "destructive" : usedPercent > 75 ? "secondary" : "default"}
                >
                    {usedPercent.toFixed(1)}%
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-secondary"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="url(#memory-gradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${usedPercent * 2.51} 251`}
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="memory-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="50%" stopColor="#14b8a6" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-3xl font-bold", getUsageColor(usedPercent))}>
                                {usedPercent.toFixed(0)}%
                            </span>
                            <span className="text-xs text-muted-foreground">Used</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">RAM Usage</span>
                            <span>{formatBytes(used)}</span>
                        </div>
                        <Progress
                            value={usedPercent}
                            className="h-2"
                            indicatorClassName="bg-gradient-to-r from-emerald-500 to-teal-500"
                        />
                    </div>
                    {swapTotal > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Swap</span>
                                <span>{formatBytes(swapUsed)} / {formatBytes(swapTotal)}</span>
                            </div>
                            <Progress
                                value={swapPercent}
                                className="h-1.5"
                                indicatorClassName="bg-amber-500"
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

interface DiskInfo {
    device: string;
    mountPoint: string;
    total: number;
    used: number;
    usedPercent: number;
}

interface DiskGaugeProps {
    disks: DiskInfo[];
    className?: string;
}

export function DiskGauge({ disks, className }: DiskGaugeProps) {
    const totalSpace = disks.reduce((acc, d) => acc + d.total, 0);
    const usedSpace = disks.reduce((acc, d) => acc + d.used, 0);
    const overallPercent = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/10">
                        <HardDrive className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Storage</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {formatBytes(usedSpace)} / {formatBytes(totalSpace)}
                        </p>
                    </div>
                </div>
                <Badge variant="outline">{disks.length} drives</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-secondary"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="url(#disk-gradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${overallPercent * 2.51} 251`}
                                className="transition-all duration-500"
                            />
                            <defs>
                                <linearGradient id="disk-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="50%" stopColor="#a855f7" />
                                    <stop offset="100%" stopColor="#d946ef" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-violet-500">
                                {overallPercent.toFixed(0)}%
                            </span>
                            <span className="text-xs text-muted-foreground">Used</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                    {disks.map((disk, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground truncate max-w-24" title={disk.mountPoint}>
                                    {disk.mountPoint}
                                </span>
                                <span>{disk.usedPercent.toFixed(1)}%</span>
                            </div>
                            <Progress
                                value={disk.usedPercent}
                                className="h-1.5"
                                indicatorClassName={cn(
                                    disk.usedPercent > 90
                                        ? "bg-rose-500"
                                        : disk.usedPercent > 75
                                            ? "bg-amber-500"
                                            : "bg-gradient-to-r from-violet-500 to-purple-500"
                                )}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
