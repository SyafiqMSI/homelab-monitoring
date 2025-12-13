import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownLeft, Wifi } from "lucide-react";
import { formatBytes } from "@/lib/api";
import type { NetworkMetrics } from "@/lib/api";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface NetworkCardProps {
    networks: NetworkMetrics[];
    className?: string;
}

export function NetworkCard({ networks, className }: NetworkCardProps) {
    const totalSent = networks.reduce((acc, n) => acc + n.bytesSent, 0);
    const totalRecv = networks.reduce((acc, n) => acc + n.bytesRecv, 0);
    const totalPacketsSent = networks.reduce((acc, n) => acc + n.packetsSent, 0);
    const totalPacketsRecv = networks.reduce((acc, n) => acc + n.packetsRecv, 0);

    return (
        <Card className={cn("relative overflow-hidden", className)}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10">
                        <Wifi className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                        <CardTitle className="text-base">Network</CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {networks.length} active interfaces
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <ArrowDownLeft className="h-4 w-4" />
                            <span className="text-xs font-medium">Download</span>
                        </div>
                        <p className="text-xl font-bold mt-1">{formatBytes(totalRecv)}</p>
                        <p className="text-xs text-muted-foreground">
                            {totalPacketsRecv.toLocaleString()} packets
                        </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                        <div className="flex items-center gap-2 text-blue-500">
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-xs font-medium">Upload</span>
                        </div>
                        <p className="text-xl font-bold mt-1">{formatBytes(totalSent)}</p>
                        <p className="text-xs text-muted-foreground">
                            {totalPacketsSent.toLocaleString()} packets
                        </p>
                    </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {networks.map((net, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-sm"
                        >
                            <span className="font-medium truncate max-w-24" title={net.interface}>
                                {net.interface}
                            </span>
                            <div className="flex gap-3">
                                <span className="text-emerald-500 text-xs">
                                    ↓ {formatBytes(net.bytesRecv)}
                                </span>
                                <span className="text-blue-500 text-xs">
                                    ↑ {formatBytes(net.bytesSent)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

interface MetricsChartProps {
    data: Array<{
        time: string;
        cpu?: number;
        memory?: number;
        disk?: number;
    }>;
    title?: string;
    className?: string;
}

export function MetricsChart({
    data,
    title = "System Performance",
    className,
}: MetricsChartProps) {
    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <div className="flex gap-3">
                        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                            CPU
                        </Badge>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Memory
                        </Badge>
                        <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/20">
                            Disk
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                            <defs>
                                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="diskGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#888" }}
                            />
                            <YAxis
                                domain={[0, 100]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#888" }}
                                width={30}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                                }}
                                labelStyle={{ color: "hsl(var(--foreground))" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="cpu"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                fill="url(#cpuGradient)"
                                name="CPU"
                                dot={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="memory"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#memoryGradient)"
                                name="Memory"
                                dot={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="disk"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                fill="url(#diskGradient)"
                                name="Disk"
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
