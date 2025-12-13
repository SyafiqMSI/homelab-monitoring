import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Server,
    HardDrive,
    Shield,
    Container as ContainerIcon,
    MonitorPlay,
    Home,
    Gamepad2,
    RefreshCw,
    ExternalLink,
    MoreVertical,
    Wifi,
    WifiOff,
    ServerCog,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Server as ServerType } from "@/lib/api";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    server: Server,
    "hard-drive": HardDrive,
    shield: Shield,
    container: ContainerIcon,
    "monitor-play": MonitorPlay,
    home: Home,
    "gamepad-2": Gamepad2,
    "server-cog": ServerCog,
};

interface ServerCardProps {
    server: ServerType;
    onPing?: (id: string) => void;
    className?: string;
}

export function ServerCard({ server, onPing, className }: ServerCardProps) {
    const Icon = iconMap[server.icon] || Server;
    const isOnline = server.status === "online";

    const getStatusColor = () => {
        switch (server.status) {
            case "online":
                return "bg-emerald-500";
            case "warning":
                return "bg-amber-500";
            case "offline":
                return "bg-rose-500";
            default:
                return "bg-gray-500";
        }
    };

    const getTypeColor = () => {
        switch (server.type) {
            case "proxmox":
                return "from-orange-500/20 to-amber-500/10";
            case "nas":
                return "from-blue-500/20 to-cyan-500/10";
            case "linux":
                return "from-violet-500/20 to-purple-500/10";
            case "windows":
                return "from-sky-500/20 to-blue-500/10";
            default:
                return "from-gray-500/20 to-gray-500/10";
        }
    };

    const getTypeBadge = () => {
        switch (server.type) {
            case "proxmox":
                return "border-orange-500/50 text-orange-500 bg-orange-500/10";
            case "nas":
                return "border-blue-500/50 text-blue-500 bg-blue-500/10";
            case "linux":
                return "border-violet-500/50 text-violet-500 bg-violet-500/10";
            case "windows":
                return "border-sky-500/50 text-sky-500 bg-sky-500/10";
            default:
                return "";
        }
    };

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/50",
                !isOnline && "opacity-75",
                className
            )}
        >
            {/* Status indicator */}
            <div className={cn("absolute top-0 left-0 w-full h-0.5", getStatusColor())} />

            {/* Background gradient decoration */}
            <div className={cn(
                "absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br opacity-30 -translate-y-1/2 translate-x-1/2 blur-2xl",
                getTypeColor()
            )} />

            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-start gap-3">
                    <Avatar className={cn("h-12 w-12 rounded-xl bg-gradient-to-br border-2", getTypeColor(), isOnline ? "border-primary/20" : "border-muted")}>
                        <AvatarFallback className="bg-transparent">
                            <Icon className={cn("h-6 w-6", isOnline ? "text-foreground" : "text-muted-foreground")} />
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {server.name}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        {isOnline ? (
                                            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                                        ) : (
                                            <WifiOff className="h-3.5 w-3.5 text-rose-500" />
                                        )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isOnline ? "Online" : "Offline"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">
                            {server.ip}:{server.port}
                        </p>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPing?.(server.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Ping
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open WebUI
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                    {server.description}
                </p>

                <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn("capitalize text-xs", getTypeBadge())}>
                        {server.type}
                    </Badge>
                    {server.location && (
                        <span className="text-xs text-muted-foreground">{server.location}</span>
                    )}
                </div>

                {server.tags && server.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {server.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface ServerGridProps {
    servers: ServerType[];
    onPing?: (id: string) => void;
    className?: string;
}

export function ServerGrid({ servers, onPing, className }: ServerGridProps) {
    const onlineCount = servers.filter((s) => s.status === "online").length;

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Servers</h2>
                    <p className="text-sm text-muted-foreground">
                        {onlineCount} online / {servers.length} total
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                        {onlineCount} Online
                    </Badge>
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-500">
                        {servers.length - onlineCount} Offline
                    </Badge>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {servers.map((server) => (
                    <ServerCard key={server.id} server={server} onPing={onPing} />
                ))}
            </div>
        </div>
    );
}
