import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState, useMemo } from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { Activity, Download, HardDrive, Upload, Cpu, Clock } from "lucide-react"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { api, formatBytes, formatPercent, formatUptime } from "@/lib/api"
import type { SystemMetrics, MetricsHistory } from "@/lib/api"

export const Route = createFileRoute("/performance")({
    component: PerformancePage,
})

function PerformancePage() {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
    const [history, setHistory] = useState<MetricsHistory[]>([])
    const [loading, setLoading] = useState(true)

    // Fetch initial history
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await api.getMetricsHistory(60)
                setHistory(data)
            } catch (e) {
                console.error(e)
            }
        }
        fetchHistory()
    }, [])

    // Poll current metrics
    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const data = await api.getSystemMetrics()
                setMetrics(data)
                setLoading(false)

                if (data) {
                    setHistory(prev => {
                        const newPoint: MetricsHistory = {
                            timestamp: new Date().toISOString(),
                            cpuUsage: data.cpu.usagePercent,
                            memoryUsage: data.memory.usedPercent,
                            diskUsage: data.disk && data.disk.length > 0 ? data.disk[0].usedPercent : 0,
                            networkIn: data.network.reduce((acc, curr) => acc + curr.bytesRecv, 0),
                            networkOut: data.network.reduce((acc, curr) => acc + curr.bytesSent, 0),
                        }
                        return [...prev.slice(-59), newPoint]
                    })
                }
            } catch (e) {
                console.error(e)
                setLoading(false)
            }
        }

        fetchMetrics()
        const interval = setInterval(fetchMetrics, 3000)
        return () => clearInterval(interval)
    }, [])

    // Process history for net rate
    const chartData = useMemo(() => {
        return history.map((item, index) => {
            const prev = history[index - 1]
            let netInRate = 0
            let netOutRate = 0

            if (prev) {
                const timeDiff = (new Date(item.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000
                if (timeDiff > 0) {
                    netInRate = (item.networkIn - prev.networkIn) / timeDiff
                    netOutRate = (item.networkOut - prev.networkOut) / timeDiff
                    if (netInRate < 0) netInRate = 0
                    if (netOutRate < 0) netOutRate = 0
                }
            }

            return {
                ...item,
                time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                netInRate,
                netOutRate
            }
        })
    }, [history])

    const currentNet = useMemo(() => {
        if (!metrics) return { rx: 0, tx: 0 }
        return metrics.network.reduce((acc, iface) => ({
            rx: acc.rx + iface.bytesRecv,
            tx: acc.tx + iface.bytesSent
        }), { rx: 0, tx: 0 })
    }, [metrics])

    if (loading && !metrics) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground">
                Loading performance metrics...
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">System Performance</h2>
                <p className="text-muted-foreground">
                    Real-time monitoring of your server resources.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.cpu.usagePercent.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics?.cpu.cores} Cores ({metrics?.cpu.logicalCores} Threads)
                        </p>
                        <Progress value={metrics?.cpu.usagePercent} className="mt-3 h-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics?.memory.usedPercent.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            {formatBytes(metrics?.memory.used || 0)} / {formatBytes(metrics?.memory.total || 0)}
                        </p>
                        <Progress value={metrics?.memory.usedPercent} className="mt-3 h-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network In</CardTitle>
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatBytes(chartData[chartData.length - 1]?.netInRate || 0)}/s
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total: {formatBytes(currentNet.rx)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network Out</CardTitle>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatBytes(chartData[chartData.length - 1]?.netOutRate || 0)}/s
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total: {formatBytes(currentNet.tx)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>CPU History</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                    />
                                    <Area type="monotone" dataKey="cpuUsage" stroke="#f59e0b" fillOpacity={1} fill="url(#colorCpu)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Memory History</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                        labelStyle={{ color: "hsl(var(--foreground))" }}
                                    />
                                    <Area type="monotone" dataKey="memoryUsage" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMem)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Disk Usage</CardTitle>
                        <CardDescription>Storage utilization across partitions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {metrics?.disk.map((disk) => (
                            <div key={disk.mountPoint} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{disk.mountPoint}</span>
                                        <span className="text-muted-foreground text-xs">({disk.fstype})</span>
                                    </div>
                                    <span>{formatPercent(disk.usedPercent)}</span>
                                </div>
                                <Progress value={disk.usedPercent} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Used: {formatBytes(disk.used)}</span>
                                    <span>Total: {formatBytes(disk.total)}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0 border-border">
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Uptime
                            </span>
                            <span className="font-medium font-mono">{metrics ? formatUptime(metrics.uptime) : '-'}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-b pb-2 last:border-0 last:pb-0 border-border">
                            <span className="text-sm text-muted-foreground">CPU Model</span>
                            <span className="font-medium text-xs">{metrics?.cpu.modelName}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
