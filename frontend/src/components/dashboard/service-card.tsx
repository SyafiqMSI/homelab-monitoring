import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Film,
    PlayCircle,
    Layers,
    ShieldCheck,
    Globe,
    Home,
    LineChart,
    Lock,
    Activity,
    Database,
    ServerCog,
    ExternalLink,
} from "lucide-react";
import type { Service } from "@/lib/api";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    film: Film,
    "play-circle": PlayCircle,
    layers: Layers,
    "shield-check": ShieldCheck,
    globe: Globe,
    home: Home,
    "line-chart": LineChart,
    lock: Lock,
    activity: Activity,
    database: Database,
    "server-cog": ServerCog,
};

interface ServiceCardProps {
    service: Service;
    onCheck?: (id: string) => void;
    className?: string;
}

export function ServiceCard({ service, className }: ServiceCardProps) {
    const Icon = iconMap[service.icon] || Globe;

    const getStatusColor = () => {
        switch (service.status) {
            case "healthy":
                return "text-emerald-500 bg-emerald-500";
            case "degraded":
                return "text-amber-500 bg-amber-500";
            case "unhealthy":
                return "text-rose-500 bg-rose-500";
            default:
                return "text-gray-500 bg-gray-500";
        }
    };

    const getCategoryColor = () => {
        switch (service.category) {
            case "media":
                return "from-pink-500/20 to-rose-500/10";
            case "network":
                return "from-blue-500/20 to-cyan-500/10";
            case "storage":
                return "from-violet-500/20 to-purple-500/10";
            case "security":
                return "from-emerald-500/20 to-teal-500/10";
            case "monitoring":
                return "from-amber-500/20 to-orange-500/10";
            case "automation":
                return "from-cyan-500/20 to-blue-500/10";
            case "infrastructure":
                return "from-red-500/20 to-orange-500/10";
            case "management":
                return "from-indigo-500/20 to-violet-500/10";
            default:
                return "from-gray-500/20 to-gray-500/10";
        }
    };

    const isHealthy = service.status === "healthy";
    const statusParts = getStatusColor().split(" ");
    const textColor = statusParts[0];
    const bgColor = statusParts[1];

    return (
        <Card
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer",
                !isHealthy && "opacity-90",
                className
            )}
            onClick={() => window.open(service.url, "_blank")}
        >
            {/* Background gradient */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity group-hover:opacity-70",
                getCategoryColor()
            )} />

            <CardContent className="relative p-4">
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "p-2.5 rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110",
                        getCategoryColor()
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold truncate">{service.name}</h3>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", bgColor)} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="capitalize">{service.status}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {service.description}
                        </p>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-xs">
                            {service.category}
                        </Badge>
                        {service.responseTime > 0 && (
                            <span className={cn(
                                "font-mono",
                                service.responseTime > 200 ? "text-amber-500" : "text-muted-foreground"
                            )}>
                                {service.responseTime}ms
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{service.uptimePercent.toFixed(1)}%</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface ServiceGridProps {
    services: Service[];
    onCheck?: (id: string) => void;
    className?: string;
}

export function ServiceGrid({ services, onCheck, className }: ServiceGridProps) {
    const healthyCount = services.filter((s) => s.status === "healthy").length;
    const degradedCount = services.filter((s) => s.status === "degraded").length;
    const unhealthyCount = services.filter((s) => s.status === "unhealthy").length;

    const groupedServices = services.reduce((acc, service) => {
        const category = service.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(service);
        return acc;
    }, {} as Record<string, Service[]>);

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Services</h2>
                    <p className="text-sm text-muted-foreground">
                        {healthyCount} healthy / {services.length} total
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">
                        {healthyCount} Healthy
                    </Badge>
                    {degradedCount > 0 && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500">
                            {degradedCount} Degraded
                        </Badge>
                    )}
                    {unhealthyCount > 0 && (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-500">
                            {unhealthyCount} Unhealthy
                        </Badge>
                    )}
                </div>
            </div>

            {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground capitalize">
                        {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {categoryServices.map((service) => (
                            <ServiceCard key={service.id} service={service} onCheck={onCheck} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

interface ServiceStatusOverviewProps {
    services: Service[];
    className?: string;
}

export function ServiceStatusOverview({ services, className }: ServiceStatusOverviewProps) {
    const healthyCount = services.filter((s) => s.status === "healthy").length;
    const totalServices = services.length;
    const healthPercent = totalServices > 0 ? (healthyCount / totalServices) * 100 : 0;

    const avgResponseTime = services
        .filter((s) => s.responseTime > 0)
        .reduce((acc, s, _, arr) => acc + s.responseTime / arr.length, 0);

    const avgUptime = services.reduce((acc, s) => acc + s.uptimePercent / services.length, 0);

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">Service Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                    <div className="relative w-24 h-24">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="10"
                                className="text-secondary"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke={healthPercent === 100 ? "#10b981" : healthPercent > 80 ? "#f59e0b" : "#ef4444"}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={`${healthPercent * 2.51} 251`}
                                className="transition-all duration-500"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{healthyCount}</span>
                            <span className="text-xs text-muted-foreground">/{totalServices}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded-lg bg-secondary/50 text-center">
                        <p className="text-muted-foreground text-xs">Avg Response</p>
                        <p className="font-semibold">{avgResponseTime.toFixed(0)}ms</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50 text-center">
                        <p className="text-muted-foreground text-xs">Avg Uptime</p>
                        <p className="font-semibold">{avgUptime.toFixed(1)}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
