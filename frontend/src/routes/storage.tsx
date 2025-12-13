import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { api, formatBytes, formatPercent } from "@/lib/api"
import type { DiskMetrics } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { HardDrive, Database, FolderOpen } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

export const Route = createFileRoute("/storage")({
  component: StoragePage,
})

function CustomLegend() {
  return (
    <div className="flex items-center justify-center gap-6 pt-2">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-destructive" />
        <span className="text-sm font-medium text-muted-foreground">Used</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-primary" />
        <span className="text-sm font-medium text-muted-foreground">Free</span>
      </div>
    </div>
  )
}

function StoragePage() {
  const [disks, setDisks] = useState<DiskMetrics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getDiskMetrics()
        setDisks(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Calculate totals
  const totalCapacity = disks.reduce((acc, d) => acc + d.total, 0)
  const totalUsed = disks.reduce((acc, d) => acc + d.used, 0)
  const totalFree = disks.reduce((acc, d) => acc + d.free, 0)

  // Prepare Pie Data
  const pieData = [
    { name: 'Used', value: totalUsed },
    { name: 'Free', value: totalFree },
  ]

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-muted-foreground">
        Loading storage information...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Storage Management</h2>
        <p className="text-muted-foreground">Monitor disk partitions and capacity.</p>
      </div>

      {/* Summary Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalCapacity)}</div>
            <p className="text-xs text-muted-foreground">Across {disks.length} partitions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Space</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalUsed)}</div>
            <p className="text-xs text-muted-foreground">{formatPercent((totalUsed / (totalCapacity || 1)) * 100)} utilized</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Space</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalFree)}</div>
            <p className="text-xs text-muted-foreground">{formatPercent((totalFree / (totalCapacity || 1)) * 100)} available</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        {/* Visual Chart */}
        <Card className="col-span-full md:col-span-3">
          <CardHeader>
            <CardTitle>Storage Distribution</CardTitle>
            <CardDescription>Global storage usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    <Cell key="cell-used" className="text-destructive fill-current" />
                    <Cell key="cell-free" className="text-primary fill-current" />
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => formatBytes(val)}
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend content={<CustomLegend />} verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Partition List */}
        <Card className="col-span-full md:col-span-4">
          <CardHeader>
            <CardTitle>Partitions</CardTitle>
            <CardDescription>Detailed disk information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {disks.map((disk) => (
              <div key={disk.mountPoint} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-primary" />
                      <span className="font-medium text-base">{disk.device}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Mounted at <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{disk.mountPoint}</span> • {disk.fstype}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">{formatPercent(disk.usedPercent)}</span>
                    <p className="text-xs text-muted-foreground">Used</p>
                  </div>
                </div>
                <Progress value={disk.usedPercent} className="h-2.5" />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Used: {formatBytes(disk.used)}</span>
                  <span>Free: {formatBytes(disk.free)}</span>
                  <span>Total: {formatBytes(disk.total)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
