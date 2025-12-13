import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { api, formatBytes, type Container } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Container as ContainerIcon,
    Play,
    Square,
    RotateCcw,
    MoreVertical,
    Search,
    RefreshCw,
    Cpu,
    MemoryStick,
    Network,
    HardDrive,
    FileText,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Loader2,
    Terminal,
} from "lucide-react";

export const Route = createFileRoute("/containers")({
    component: ContainersPage,
});

function ContainersPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const [containers, setContainers] = useState<Container[]>([]);
    const [filteredContainers, setFilteredContainers] = useState<Container[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchContainers = useCallback(async () => {
        try {
            const data = await api.getContainers();
            setContainers(data);
        } catch (error) {
            console.error("Failed to fetch containers:", error);
            toast.error("Failed to fetch containers");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchContainers();
        }
    }, [fetchContainers, isAuthenticated, authLoading]);

    // Filter containers
    useEffect(() => {
        let result = containers;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (c) =>
                    c.name.toLowerCase().includes(query) ||
                    c.image.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== "all") {
            result = result.filter((c) => c.state === statusFilter);
        }

        setFilteredContainers(result);
    }, [containers, searchQuery, statusFilter]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchContainers();
        setIsRefreshing(false);
        toast.success("Containers refreshed");
    };

    const handleStart = async (id: string) => {
        setActionLoading(id);
        try {
            await api.startContainer(id);
            toast.success("Container started");
            await fetchContainers();
        } catch (error) {
            toast.error("Failed to start container");
        } finally {
            setActionLoading(null);
        }
    };

    const handleStop = async (id: string) => {
        setActionLoading(id);
        try {
            await api.stopContainer(id);
            toast.success("Container stopped");
            await fetchContainers();
        } catch (error) {
            toast.error("Failed to stop container");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestart = async (id: string) => {
        setActionLoading(id);
        try {
            await api.restartContainer(id);
            toast.success("Container restarted");
            await fetchContainers();
        } catch (error) {
            toast.error("Failed to restart container");
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (state: string) => {
        switch (state) {
            case "running":
                return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
            case "exited":
                return "bg-red-500/20 text-red-400 border-red-500/30";
            case "paused":
                return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            case "restarting":
                return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border-gray-500/30";
        }
    };

    const getStatusIcon = (state: string) => {
        switch (state) {
            case "running":
                return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
            case "exited":
                return <XCircle className="h-4 w-4 text-red-400" />;
            case "paused":
                return <AlertCircle className="h-4 w-4 text-yellow-400" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-400" />;
        }
    };

    const runningCount = containers.filter((c) => c.state === "running").length;
    const stoppedCount = containers.filter((c) => c.state === "exited").length;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-64 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ContainerIcon className="h-7 w-7 text-primary" />
                        Docker Containers
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and monitor your Docker containers
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    variant="outline"
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{containers.length}</p>
                            </div>
                            <ContainerIcon className="h-8 w-8 text-primary opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Running</p>
                                <p className="text-2xl font-bold text-emerald-400">{runningCount}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stopped</p>
                                <p className="text-2xl font-bold text-red-400">{stoppedCount}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Other</p>
                                <p className="text-2xl font-bold text-yellow-400">
                                    {containers.length - runningCount - stoppedCount}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-yellow-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search containers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="running">Running</SelectItem>
                        <SelectItem value="exited">Stopped</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Container Grid */}
            {filteredContainers.length === 0 ? (
                <Card className="p-12 text-center">
                    <ContainerIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No containers found</h3>
                    <p className="text-muted-foreground mt-1">
                        {searchQuery || statusFilter !== "all"
                            ? "Try adjusting your filters"
                            : "No Docker containers are running on this host"}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredContainers.map((container) => (
                        <Card
                            key={container.id}
                            className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(container.state)}
                                        <div>
                                            <CardTitle className="text-base font-semibold">
                                                {container.name}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {container.id}
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
                                            {user?.role === "admin" && (
                                                <>
                                                    {container.state !== "running" ? (
                                                        <DropdownMenuItem onClick={() => handleStart(container.id)}>
                                                            <Play className="h-4 w-4 mr-2" />
                                                            Start
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleStop(container.id)}>
                                                                <Square className="h-4 w-4 mr-2" />
                                                                Stop
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleRestart(container.id)}>
                                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                                Restart
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => navigate({ to: "/terminal", search: { cmd: `docker exec -it ${container.name} /bin/sh` } })}>
                                                                <Terminal className="h-4 w-4 mr-2" />
                                                                Exec
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                </>
                                            )}
                                            <DropdownMenuItem onClick={() => setSelectedContainer(container)}>
                                                <FileText className="h-4 w-4 mr-2" />
                                                Details
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Image & Status */}
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground truncate flex-1 mr-2">
                                        {container.image}
                                    </p>
                                    <Badge className={`${getStatusColor(container.state)} capitalize`}>
                                        {container.state}
                                    </Badge>
                                </div>

                                {/* Ports */}
                                {container.ports && container.ports.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {container.ports.slice(0, 3).map((port, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                {port.publicPort || port.privatePort}:{port.privatePort}
                                            </Badge>
                                        ))}
                                        {container.ports.length > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{container.ports.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {/* Stats (only for running containers) */}
                                {container.state === "running" && container.stats && (
                                    <div className="space-y-3 pt-2 border-t">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <Cpu className="h-3 w-3" /> CPU
                                                </span>
                                                <span>{container.stats.cpuPercent?.toFixed(1) || 0}%</span>
                                            </div>
                                            <Progress
                                                value={container.stats.cpuPercent || 0}
                                                className="h-1.5"
                                                indicatorClassName="bg-cyan-500"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-1 text-muted-foreground">
                                                    <MemoryStick className="h-3 w-3" /> Memory
                                                </span>
                                                <span>
                                                    {formatBytes(container.stats.memoryUsage || 0)} /{" "}
                                                    {formatBytes(container.stats.memoryLimit || 0)}
                                                </span>
                                            </div>
                                            <Progress
                                                value={container.stats.memoryPercent || 0}
                                                className="h-1.5"
                                                indicatorClassName="bg-violet-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                <div className="flex gap-2 pt-2">
                                    {container.state !== "running" ? (
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => handleStart(container.id)}
                                            disabled={actionLoading === container.id}
                                        >
                                            {actionLoading === container.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Play className="h-4 w-4 mr-1" />
                                                    Start
                                                </>
                                            )}
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1"
                                                onClick={() => handleStop(container.id)}
                                                disabled={actionLoading === container.id}
                                            >
                                                {actionLoading === container.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Square className="h-4 w-4 mr-1" />
                                                        Stop
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleRestart(container.id)}
                                                disabled={actionLoading === container.id}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Container Details Dialog */}
            <Dialog open={!!selectedContainer} onOpenChange={() => setSelectedContainer(null)}>
                <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
                    {selectedContainer && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {getStatusIcon(selectedContainer.state)}
                                    {selectedContainer.name}
                                </DialogTitle>
                                <DialogDescription className="font-mono text-xs">
                                    {selectedContainer.id}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Image</p>
                                        <p className="font-medium">{selectedContainer.image}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Status</p>
                                        <p className="font-medium">{selectedContainer.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Network Mode</p>
                                        <p className="font-medium">{selectedContainer.networkMode || "default"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Command</p>
                                        <p className="font-mono text-sm truncate">{selectedContainer.command}</p>
                                    </div>
                                </div>

                                {/* Ports */}
                                {selectedContainer.ports && selectedContainer.ports.length > 0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Ports</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedContainer.ports.map((port, idx) => (
                                                <Badge key={idx} variant="outline">
                                                    {port.ip || "0.0.0.0"}:{port.publicPort || "-"} → {port.privatePort}/{port.type}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mounts */}
                                {selectedContainer.mounts && selectedContainer.mounts.length > 0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Mounts</p>
                                        <div className="space-y-1">
                                            {selectedContainer.mounts.map((mount, idx) => (
                                                <div key={idx} className="text-sm font-mono bg-muted p-2 rounded">
                                                    {mount.source || mount.name} → {mount.destination}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Labels */}
                                {selectedContainer.labels && Object.keys(selectedContainer.labels).length > 0 && (
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Labels</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {Object.entries(selectedContainer.labels).map(([key, value]) => (
                                                <div key={key} className="text-xs font-mono bg-muted p-1.5 rounded flex">
                                                    <span className="text-primary">{key}:</span>
                                                    <span className="ml-1 text-muted-foreground truncate">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                {selectedContainer.state === "running" && selectedContainer.stats && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">CPU Usage</span>
                                            </div>
                                            <Progress
                                                value={selectedContainer.stats.cpuPercent || 0}
                                                className="h-2"
                                                indicatorClassName="bg-cyan-500"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {selectedContainer.stats.cpuPercent?.toFixed(2) || 0}%
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">Memory Usage</span>
                                            </div>
                                            <Progress
                                                value={selectedContainer.stats.memoryPercent || 0}
                                                className="h-2"
                                                indicatorClassName="bg-violet-500"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {formatBytes(selectedContainer.stats.memoryUsage || 0)} /{" "}
                                                {formatBytes(selectedContainer.stats.memoryLimit || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Network className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">Network I/O</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                ↓ {formatBytes(selectedContainer.stats.networkRx || 0)} /{" "}
                                                ↑ {formatBytes(selectedContainer.stats.networkTx || 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <HardDrive className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">Block I/O</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Read: {formatBytes(selectedContainer.stats.blockRead || 0)} /{" "}
                                                Write: {formatBytes(selectedContainer.stats.blockWrite || 0)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
