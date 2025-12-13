import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { type LucideIcon } from "lucide-react";

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    progress?: number;
    progressColor?: string;
    className?: string;
    iconClassName?: string;
}

export function StatsCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    progress,
    progressColor = "bg-primary",
    className,
    iconClassName,
}: StatsCardProps) {
    return (
        <Card
            className={cn(
                "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-border/50 bg-gradient-to-br from-card to-card/80",
                className
            )}
        >
            {/* Decorative gradient background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div
                    className={cn(
                        "p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5",
                        iconClassName
                    )}
                >
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold tracking-tight">{value}</div>
                    {trend && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <span
                                        className={cn(
                                            "text-xs font-medium px-1.5 py-0.5 rounded",
                                            trend.isPositive
                                                ? "bg-emerald-500/10 text-emerald-500"
                                                : "bg-rose-500/10 text-rose-500"
                                        )}
                                    >
                                        {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Change from last period</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                {subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                )}
                {progress !== undefined && (
                    <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Usage</span>
                            <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress
                            value={progress}
                            className="h-1.5"
                            indicatorClassName={cn(
                                progress > 90
                                    ? "bg-rose-500"
                                    : progress > 75
                                        ? "bg-amber-500"
                                        : progressColor
                            )}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
