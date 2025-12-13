import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import {
  api,
  formatUptime,
  MetricsWebSocket,
  type SystemMetrics,
  type Container,
  type Device,
  type Service,
} from "@/lib/api";
import { StatsCard } from "@/components/dashboard/stats-card";
import { CPUGauge, MemoryGauge, DiskGauge } from "@/components/dashboard/metric-gauges";
import { NetworkCard, MetricsChart } from "@/components/dashboard/network-chart";
import { ContainerCard } from "@/components/dashboard/container-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Container as ContainerIcon,
  Server as ServerIcon,
  Globe,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Monitor,
  Laptop,
  Smartphone,
  Camera,
  Router,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { LinkPreview } from "@/components/ui/link-preview";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

// Device type icons mapping
const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pc: Monitor,
  laptop: Laptop,
  server: ServerIcon,
  phone: Smartphone,
  cctv: Camera,
  router: Router,
  other: HelpCircle,
};

function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartData, setChartData] = useState<Array<{ time: string; cpu: number; memory: number; disk: number }>>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [metricsData, containersData, devicesData, servicesData] = await Promise.all([
        api.getSystemMetrics(),
        api.getContainers(),
        api.getDevices(),
        api.getServices(true), // Get with status check
      ]);

      setMetrics(metricsData);
      setContainers(containersData);
      setDevices(devicesData);
      setServices(servicesData);

      // Update chart data
      const time = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const diskUsage = metricsData.disk.length > 0 ? metricsData.disk[0].usedPercent : 0;

      setChartData((prev) => {
        const newData = [
          ...prev,
          {
            time,
            cpu: metricsData.cpu.usagePercent,
            memory: metricsData.memory.usedPercent,
            disk: diskUsage,
          },
        ];
        // Keep only last 20 data points
        return newData.slice(-20);
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to fetch dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  // Initial fetch - only when authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchData();
    }
  }, [fetchData, isAuthenticated, authLoading]);

  // WebSocket connection for real-time metrics - only when authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const ws = new MetricsWebSocket(
      (newMetrics) => {
        setMetrics(newMetrics);
        setWsConnected(true);

        // Update chart data
        const time = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const diskUsage = newMetrics.disk.length > 0 ? newMetrics.disk[0].usedPercent : 0;

        setChartData((prev) => {
          const newData = [
            ...prev,
            {
              time,
              cpu: newMetrics.cpu.usagePercent,
              memory: newMetrics.memory.usedPercent,
              disk: diskUsage,
            },
          ];
          return newData.slice(-20);
        });
      },
      () => setWsConnected(false),
      () => setWsConnected(false)
    );

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, [isAuthenticated, authLoading]);

  // Periodically refresh containers and services - only when authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const interval = setInterval(async () => {
      try {
        const [containersData, servicesData] = await Promise.all([
          api.getContainers(),
          api.getServices(),
        ]);
        setContainers(containersData);
        setServices(servicesData);
      } catch (error) {
        console.error("Failed to refresh:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading]);

  const handleContainerStart = async (id: string) => {
    try {
      await api.startContainer(id);
      toast.success("Container started");
      const data = await api.getContainers();
      setContainers(data);
    } catch {
      toast.error("Failed to start container");
    }
  };

  const handleContainerStop = async (id: string) => {
    try {
      await api.stopContainer(id);
      toast.success("Container stopped");
      const data = await api.getContainers();
      setContainers(data);
    } catch {
      toast.error("Failed to stop container");
    }
  };

  const handleContainerRestart = async (id: string) => {
    try {
      await api.restartContainer(id);
      toast.success("Container restarted");
      const data = await api.getContainers();
      setContainers(data);
    } catch {
      toast.error("Failed to restart container");
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const runningContainers = containers.filter((c) => c.state === "running").length;
  const onlineDevices = devices.filter((d) => d.isOnline).length;
  const onlineServices = services.filter((s) => s.status === "online").length;
  const offlineServices = services.filter((s) => s.status === "offline" || s.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your homelab infrastructure in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={wsConnected ? "default" : "secondary"}
            className={wsConnected ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            <Wifi className="h-3 w-3 mr-1" />
            {wsConnected ? "Live" : "Polling"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {offlineServices > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm">
              <strong>{offlineServices}</strong> service{offlineServices > 1 ? "s" : ""} are offline and need attention
            </span>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="System Uptime"
          value={metrics ? formatUptime(metrics.uptime) : "-"}
          subtitle="Since last reboot"
          icon={Clock}
          iconClassName="bg-gradient-to-br from-blue-500/20 to-cyan-500/10"
        />
        <StatsCard
          title="Containers"
          value={`${runningContainers}/${containers.length}`}
          subtitle={`${runningContainers} running`}
          icon={ContainerIcon}
          progress={containers.length > 0 ? (runningContainers / containers.length) * 100 : 0}
          progressColor="bg-blue-500"
          iconClassName="bg-gradient-to-br from-blue-500/20 to-indigo-500/10"
        />
        <StatsCard
          title="Devices"
          value={`${onlineDevices}/${devices.length}`}
          subtitle={`${onlineDevices} online`}
          icon={ServerIcon}
          progress={devices.length > 0 ? (onlineDevices / devices.length) * 100 : 0}
          progressColor="bg-emerald-500"
          iconClassName="bg-gradient-to-br from-emerald-500/20 to-teal-500/10"
        />
        <StatsCard
          title="Services"
          value={`${onlineServices}/${services.length}`}
          subtitle={`${onlineServices} online`}
          icon={Globe}
          progress={services.length > 0 ? (onlineServices / services.length) * 100 : 0}
          progressColor="bg-violet-500"
          iconClassName="bg-gradient-to-br from-violet-500/20 to-purple-500/10"
        />
      </div>

      {/* System Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics && (
          <>
            <CPUGauge
              usage={metrics.cpu.usagePercent}
              cores={metrics.cpu.cores}
              modelName={metrics.cpu.modelName}
              frequency={metrics.cpu.frequency}
              perCoreUsage={metrics.cpu.perCoreUsage}
            />
            <MemoryGauge
              used={metrics.memory.used}
              total={metrics.memory.total}
              usedPercent={metrics.memory.usedPercent}
              swapUsed={metrics.memory.swapUsed}
              swapTotal={metrics.memory.swapTotal}
              swapPercent={metrics.memory.swapPercent}
            />
            <DiskGauge
              disks={metrics.disk.map((d) => ({
                device: d.device,
                mountPoint: d.mountPoint,
                total: d.total,
                used: d.used,
                usedPercent: d.usedPercent,
              }))}
            />
            <NetworkCard networks={metrics.network} />
          </>
        )}
      </div>

      {/* Performance Chart */}
      {chartData.length > 1 && (
        <MetricsChart data={chartData} title="Real-time Performance" />
      )}

      {/* Tabs for Containers, Devices, Services */}
      <Tabs defaultValue="containers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="containers" className="gap-2">
            <ContainerIcon className="h-4 w-4" />
            Containers
            <Badge variant="secondary" className="ml-1">
              {containers.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <ServerIcon className="h-4 w-4" />
            Devices
            <Badge variant="secondary" className="ml-1">
              {devices.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Globe className="h-4 w-4" />
            Services
            <Badge variant="secondary" className="ml-1">
              {services.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="containers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {containers.slice(0, 6).map((container) => (
              <ContainerCard
                key={container.id}
                container={container}
                onStart={handleContainerStart}
                onStop={handleContainerStop}
                onRestart={handleContainerRestart}
              />
            ))}
          </div>
          {containers.length > 6 && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link to="/containers">View all {containers.length} containers</Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.slice(0, 6).map((device) => {
              const DeviceIcon = deviceIcons[device.type] || HelpCircle;
              return (
                <Card key={device.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${device.isOnline
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-gray-500/20 text-gray-400"
                            }`}
                        >
                          <DeviceIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{device.name}</CardTitle>
                          <p className="text-xs text-muted-foreground font-mono">{device.ip}</p>
                        </div>
                      </div>
                      <Badge
                        className={
                          device.isOnline
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {device.isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {device.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{device.type}</span>
                      {device.brand && <span className="text-muted-foreground">{device.brand}</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {devices.length > 6 && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link to="/devices">View all {devices.length} devices</Link>
              </Button>
            </div>
          )}
          {devices.length === 0 && (
            <Card className="p-8 text-center">
              <ServerIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No devices found</p>
              <Button asChild className="mt-4">
                <Link to="/devices">Add Device</Link>
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {services.slice(0, 8).map((service) => (
              <LinkPreview key={service.id} url={service.url} className="block h-full">
                <Card
                  className="hover:border-primary/50 transition-colors cursor-pointer h-full"
                  onClick={() => window.open(service.url, "_blank")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{service.name}</CardTitle>
                      <Badge
                        className={
                          service.status === "online"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : service.status === "error"
                              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                        }
                      >
                        {service.status === "online" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {service.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground font-mono truncate">{service.url}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground capitalize">{service.category}</span>
                      {service.responseTime > 0 && (
                        <span className="text-xs text-muted-foreground">{service.responseTime}ms</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </LinkPreview>
            ))}
          </div>
          {services.length > 8 && (
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link to="/services">View all {services.length} services</Link>
              </Button>
            </div>
          )}
          {services.length === 0 && (
            <Card className="p-8 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No services found</p>
              <Button asChild className="mt-4">
                <Link to="/services">Add Service</Link>
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
