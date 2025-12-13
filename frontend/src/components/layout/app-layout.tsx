import { Link, useMatchRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/components/auth-provider";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeCustomizer } from "@/components/theme-customizer";
import { CommandMenu } from "@/components/command-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    LayoutDashboard,
    Container,
    Server,
    Globe,
    Settings,
    Bell,
    HelpCircle,
    Activity,
    HardDrive,
    Network,
    ChevronUp,
    LogOut,
    User,
    Terminal,
} from "lucide-react";

const mainNavItems = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        badge: null,
    },
    {
        title: "Containers",
        icon: Container,
        href: "/containers",
        badge: null,
    },
    {
        title: "Devices",
        icon: Server,
        href: "/devices",
        badge: null,
    },
    {
        title: "Services",
        icon: Globe,
        href: "/services",
        badge: null,
    },
    {
        title: "Terminal",
        icon: Terminal,
        href: "/terminal",
        badge: null,
    },
];

const monitoringNavItems = [
    {
        title: "Performance",
        icon: Activity,
        href: "/performance",
    },
    {
        title: "Storage",
        icon: HardDrive,
        href: "/storage",
    },
    {
        title: "Network",
        icon: Network,
        href: "/network",
    },
];

const settingsNavItems = [
    {
        title: "Settings",
        icon: Settings,
        href: "/settings",
    },
    {
        title: "Notifications",
        icon: Bell,
        href: "/notifications",
    },
    {
        title: "Help",
        icon: HelpCircle,
        href: "/help",
    },
];

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const matchRoute = useMatchRoute();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isAuthenticated } = useAuth();

    const handleLogout = async () => {
        await logout();
        navigate({ to: "/login" });
    };

    // Get user initials for avatar fallback
    const getInitials = (name?: string) => {
        if (!name) return "HL";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <SidebarProvider defaultOpen={true}>
            <Sidebar collapsible="icon" className="border-r border-sidebar-border">
                <SidebarHeader className="border-b border-sidebar-border/50 pb-4">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                                    <Server className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Homelab</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Monitoring
                                    </span>
                                </div>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Main</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {mainNavItems.map((item) => {
                                    const isActive = matchRoute({
                                        to: item.href,
                                        fuzzy: item.href !== "/",
                                    });
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={!!isActive}>
                                                <Link to={item.href}>
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                    {item.badge && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="ml-auto text-xs bg-primary/10 text-primary"
                                                        >
                                                            {item.badge}
                                                        </Badge>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup>
                        <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {monitoringNavItems.map((item) => {
                                    const isActive = matchRoute({ to: item.href });
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={!!isActive}>
                                                <Link to={item.href}>
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    <SidebarGroup className="mt-auto">
                        <SidebarGroupLabel>Settings</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {settingsNavItems.map((item) => {
                                    const isActive = matchRoute({ to: item.href });
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild isActive={!!isActive}>
                                                <Link to={item.href}>
                                                    <item.icon className="h-4 w-4" />
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="border-t border-sidebar-border/50 pt-2">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {isAuthenticated && user ? (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton className="h-12">
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback className="text-xs">
                                                    {getInitials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-medium">{user.name}</span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {user.email}
                                                </span>
                                            </div>
                                            <ChevronUp className="h-4 w-4 opacity-50" />
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="top"
                                        align="start"
                                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                    >
                                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem>
                                            <User className="mr-2 h-4 w-4" />
                                            Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Settings className="mr-2 h-4 w-4" />
                                            Settings
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={handleLogout}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Log out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            ) : (
                                <SidebarMenuButton asChild className="h-12">
                                    <Link to="/login">
                                        <LogOut className="h-4 w-4" />
                                        <span>Sign In</span>
                                    </Link>
                                </SidebarMenuButton>
                            )}
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset className="flex flex-col min-h-screen">
                <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="h-4 shrink-0" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link to="/">Dashboard</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                {location.pathname.split("/").filter(Boolean).map((segment, index, array) => {
                                    const path = `/${array.slice(0, index + 1).join("/")}`;
                                    const isLast = index === array.length - 1;
                                    const title = segment.charAt(0).toUpperCase() + segment.slice(1);

                                    return (
                                        <div key={path} className="flex items-center gap-2">
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                {isLast ? (
                                                    <BreadcrumbPage>{title}</BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink asChild>
                                                        <Link to={path}>{title}</Link>
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>
                                        </div>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="flex items-center gap-2">
                        <CommandMenu />
                        <ThemeCustomizer />
                        <ThemeToggle />
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-6 bg-muted/30">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
