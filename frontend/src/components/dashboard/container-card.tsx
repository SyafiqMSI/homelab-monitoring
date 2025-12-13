import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Container,
    Play,
    Square,
    RotateCcw,
    MoreVertical,
    ExternalLink,
    Terminal,
    Trash2,
} from "lucide-react";
import { formatBytes, type Container as ContainerType } from "@/lib/api";

interface ContainerCardProps {
    container: ContainerType;
    onStart?: (id: string) => void;
    onStop?: (id: string) => void;
    onRestart?: (id: string) => void;
    className?: string;
}

export function ContainerCard({
    container,
    onStart,
    onStop,
    onRestart,
    className,
}: ContainerCardProps) {
    const isRunning = container.state === "running";

    const getStatusColor = () => {
        switch (container.state) {
            case "running":
                return "bg-emerald-500";
            case "paused":
                return "bg-amber-500";
            case "exited":
                return "bg-rose-500";
            default:
                return "bg-gray-500";
        }
    };

    const getHealthBadge = () => {
        switch (container.health) {
            case "healthy":
                return <Badge variant="outline" className="border-emerald-500/50 text-emerald-500 bg-emerald-500/10">Healthy</Badge>;
            case "unhealthy":
                return <Badge variant="outline" className="border-rose-500/50 text-rose-500 bg-rose-500/10">Unhealthy</Badge>;
            case "starting":
                return <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">Starting</Badge>;
            default:
                return null;
        }
    };

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50",
                className
            )}
        >
            {/* Status indicator bar */}
            <div className={cn("absolute top-0 left-0 w-full h-0.5", getStatusColor())} />

            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 mt-0.5">
                        <Container className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold">{container.name}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate max-w-40" title={container.image}>
                            {container.image}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {getHealthBadge()}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Terminal className="mr-2 h-4 w-4" />
                                Console
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Logs
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor())} />
                        <span className="text-sm capitalize">{container.status}</span>
                    </div>
                    <div className="flex gap-1">
                        <TooltipProvider>
                            {!isRunning && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10"
                                            onClick={() => onStart?.(container.id)}
                                        >
                                            <Play className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Start</TooltipContent>
                                </Tooltip>
                            )}
                            {isRunning && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-rose-500 hover:bg-rose-500/10"
                                                onClick={() => onStop?.(container.id)}
                                            >
                                                <Square className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Stop</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-amber-500 hover:bg-amber-500/10"
                                                onClick={() => onRestart?.(container.id)}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Restart</TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                        </TooltipProvider>
                    </div>
                </div>

                {/* Ports */}
                {container.ports.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {container.ports.map((port, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-mono">
                                {port.publicPort}:{port.privatePort}/{port.type}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Stats - only show when running */}
                {isRunning && container.stats && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">CPU</span>
                                    <span className="font-medium">{container.stats.cpuPercent.toFixed(1)}%</span>
                                </div>
                                <Progress
                                    value={container.stats.cpuPercent}
                                    className="h-1"
                                    indicatorClassName="bg-cyan-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Memory</span>
                                    <span className="font-medium">{container.stats.memoryPercent.toFixed(1)}%</span>
                                </div>
                                <Progress
                                    value={container.stats.memoryPercent}
                                    className="h-1"
                                    indicatorClassName="bg-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{formatBytes(container.stats.memoryUsage)} / {formatBytes(container.stats.memoryLimit)}</span>
                            <span>{container.stats.pids} PIDs</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ContainerListProps {
    containers: ContainerType[];
    onStart?: (id: string) => void;
    onStop?: (id: string) => void;
    onRestart?: (id: string) => void;
    className?: string;
}

export function ContainerList({
    containers,
    onStart,
    onStop,
    onRestart,
    className,
}: ContainerListProps) {
    const runningCount = containers.filter((c) => c.state === "running").length;

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Docker Containers</h2>
                    <p className="text-sm text-muted-foreground">
                        {runningCount} running / {containers.length} total
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                        {runningCount} Running
                    </Badge>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-500">
                        {containers.length - runningCount} Stopped
                    </Badge>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {containers.map((container) => (
                    <ContainerCard
                        key={container.id}
                        container={container}
                        onStart={onStart}
                        onStop={onStop}
                        onRestart={onRestart}
                    />
                ))}
            </div>
        </div>
    );
}
