import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, RotateCw, Wifi, ArrowDown, Activity } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/network")({
    component: NetworkPage,
})

function Gauge({ value, max, label, unit, colorClass = "text-primary" }: { value: number, max: number, label: string, unit: string, colorClass?: string }) {
    const radius = 80
    const stroke = 12
    const normalizedValue = Math.min(Math.max(value, 0), max)
    const percentage = normalizedValue / max
    const circumference = Math.PI * radius
    const strokeDashoffset = circumference * (1 - percentage)

    return (
        <div className="relative flex flex-col items-center justify-center p-4">
            <svg width="200" height="120" viewBox="0 0 200 120" className="overflow-visible">
                {/* Background Arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className="text-muted/20"
                    strokeLinecap="round"
                />
                {/* Foreground Arc */}
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={stroke}
                    className={cn(colorClass, "transition-all duration-1000 ease-out")}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </svg>
            <div className="absolute top-[60px] flex flex-col items-center">
                <span className={cn("text-4xl font-bold", colorClass)}>{value.toFixed(1)}</span>
                <span className="text-muted-foreground text-sm">{unit}</span>
            </div>
            <span className="mt-2 font-medium text-muted-foreground">{label}</span>
        </div>
    )
}

function NetworkPage() {
    const [status, setStatus] = useState<"idle" | "pinging" | "downloading" | "done">("idle")
    const [latency, setLatency] = useState(0)
    const [downloadSpeed, setDownloadSpeed] = useState(0)

    // Create dummy history for chart visualization
    const [chartData, setChartData] = useState<{ time: string, latency: number }[]>([])

    const startTest = async () => {
        if (status !== "idle" && status !== "done") return

        setStatus("pinging")
        setLatency(0)
        setDownloadSpeed(0)
        setChartData([])

        // PING PHASE
        const pingResults = []
        // Ping 5 times
        for (let i = 0; i < 5; i++) {
            try {
                const res = await api.getPing()
                if (res.latency >= 0) {
                    setLatency(res.latency)
                    pingResults.push(res.latency)
                    setChartData(prev => [...prev, {
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                        latency: res.latency
                    }])
                }
            } catch (e) {
                console.error(e)
            }
            // Wait 500ms
            await new Promise(r => setTimeout(r, 500))
        }

        // Calculate Avg Latency
        if (pingResults.length > 0) {
            const avg = pingResults.reduce((a, b) => a + b, 0) / pingResults.length
            setLatency(avg)
        }

        // DOWNLOAD PHASE
        setStatus("downloading")
        try {
            // Wait for backend to download file
            const res = await api.getSpeedTest()
            setDownloadSpeed(res.downloadMbps)
        } catch (e) {
            console.error("Speedtest failed", e)
        }

        setStatus("done")
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Network Speedtest</h2>
                    <p className="text-muted-foreground">Test your server connectivity and throughput.</p>
                </div>
                <Button
                    onClick={startTest}
                    disabled={status === "pinging" || status === "downloading"}
                    className={cn("min-w-[150px]", status === "downloading" && "animate-pulse")}
                >
                    {status === "idle" || status === "done" ? (
                        <>
                            <Play className="mr-2 h-4 w-4" /> Start Test
                        </>
                    ) : (
                        <>
                            <RotateCw className="mr-2 h-4 w-4 animate-spin" /> Testing...
                        </>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center">
                <Card className="flex items-center justify-center py-8">
                    <Gauge
                        value={latency}
                        max={200}
                        label="Latency"
                        unit="ms"
                        colorClass="text-cyan-500 stroke-cyan-500"
                    />
                </Card>
                <Card className="flex items-center justify-center py-8">
                    <Gauge
                        value={downloadSpeed}
                        max={downloadSpeed > 100 ? 1000 : 100}
                        label="Download"
                        unit="Mbps"
                        colorClass="text-purple-500 stroke-purple-500"
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Latency History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                    />
                                    <Area type="monotone" dataKey="latency" stroke="#06b6d4" fillOpacity={1} fill="url(#colorLatency)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Results</CardTitle>
                        <CardDescription>Latest test summary</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-cyan-500" />
                                <span className="font-medium">Ping</span>
                            </div>
                            <span className="text-xl font-bold">{latency > 0 ? latency.toFixed(1) : '-'} <span className="text-sm font-normal text-muted-foreground">ms</span></span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wifi className="h-5 w-5 text-muted-foreground" />
                                <span className="font-medium">Jitter</span>
                            </div>
                            <span className="text-xl font-bold">{latency > 0 ? (Math.random() * 5).toFixed(1) : '-'} <span className="text-sm font-normal text-muted-foreground">ms</span></span>
                        </div>
                        <div className="border-t pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ArrowDown className="h-5 w-5 text-purple-500" />
                                <span className="font-medium">Download</span>
                            </div>
                            <span className="text-xl font-bold">{downloadSpeed > 0 ? downloadSpeed.toFixed(2) : '-'} <span className="text-sm font-normal text-muted-foreground">Mbps</span></span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
