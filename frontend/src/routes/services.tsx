import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { LinkPreview } from "@/components/ui/link-preview";
import { api, type Service, type CreateServiceRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Globe,
  Play,
  HardDrive,
  Shield,
  Activity,
  Briefcase,
  Code,
  Database,
  Zap,
  MessageCircle,
  Grid,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Image,
  Video,
  Radio,
  Cloud,
  Folder,
  Container,
  Terminal,
  Monitor,
  Workflow,
  Clipboard,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
});

// Service icon mapping (by icon name from database)
const serviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  image: Image,
  video: Video,
  radio: Radio,
  cloud: Cloud,
  folder: Folder,
  container: Container,
  terminal: Terminal,
  monitor: Monitor,
  workflow: Workflow,
  "message-circle": MessageCircle,
  database: Database,
  clipboard: Clipboard,
  users: Users,
  briefcase: Briefcase,
  globe: Globe,
  play: Play,
  "hard-drive": HardDrive,
  shield: Shield,
  activity: Activity,
  code: Code,
  zap: Zap,
  grid: Grid,
};

// Category icons mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  media: Play,
  storage: HardDrive,
  network: Shield,
  monitoring: Activity,
  productivity: Briefcase,
  development: Code,
  database: Database,
  automation: Zap,
  communication: MessageCircle,
  other: Grid,
};

const categoryLabels: Record<string, string> = {
  media: "Media & Entertainment",
  storage: "Storage & Backup",
  network: "Network & Security",
  monitoring: "Monitoring & Logs",
  productivity: "Productivity",
  development: "Development",
  database: "Database",
  automation: "Automation",
  communication: "Communication",
  other: "Other",
};

const statusColors: Record<string, string> = {
  online: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  offline: "bg-red-500/20 text-red-400 border-red-500/30",
  error: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  disabled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  unknown: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  online: CheckCircle2,
  offline: XCircle,
  error: AlertCircle,
  disabled: Clock,
  unknown: Clock,
};

function ServicesPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateServiceRequest>({
    name: "",
    url: "",
    method: "GET",
    icon: "",
    category: "other",
    description: "",
  });

  const fetchServices = useCallback(async (refresh = false) => {
    try {
      const data = await api.getServices(refresh);
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast.error("Failed to fetch services");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Initial load with status check
      fetchServices(true);
    }
  }, [fetchServices, isAuthenticated, authLoading]);

  // Filter services
  useEffect(() => {
    let result = services;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.url.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((s) => s.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }

    setFilteredServices(result);
  }, [services, searchQuery, categoryFilter, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchServices(true);
      toast.success("Services refreshed with live status");
    } catch {
      toast.error("Failed to refresh services");
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      method: "GET",
      icon: "",
      category: "other",
      description: "",
    });
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      url: service.url,
      icon: service.icon || "",
      category: service.category || "other",
      description: service.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (service: Service) => {
    setSelectedService(service);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveNew = async () => {
    if (!formData.name || !formData.url) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      await api.createService(formData);
      toast.success("Service added successfully");
      setIsAddDialogOpen(false);
      fetchServices(true);
    } catch {
      toast.error("Failed to add service");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedService || !formData.name || !formData.url) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      await api.updateService(selectedService.id, formData);
      toast.success("Service updated successfully");
      setIsEditDialogOpen(false);
      fetchServices(true);
    } catch {
      toast.error("Failed to update service");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedService) return;

    try {
      await api.deleteService(selectedService.id);
      toast.success("Service deleted successfully");
      setIsDeleteDialogOpen(false);
      fetchServices();
    } catch {
      toast.error("Failed to delete service");
    }
  };

  const handleCheckHealth = async (serviceId: number) => {
    try {
      const result = await api.checkServiceHealth(serviceId);
      if (result.status === "online") {
        toast.success(`Service is online! (${result.responseTime}ms)`);
      } else {
        toast.error(`Service is ${result.status}`);
      }
      fetchServices(true);
    } catch {
      toast.error("Failed to check service health");
    }
  };

  const openService = (url: string) => {
    window.open(url, "_blank");
  };

  const getServiceIcon = (service: Service) => {
    // First try to get icon from service's icon field
    if (service.icon && serviceIcons[service.icon]) {
      return serviceIcons[service.icon];
    }
    // Fallback to category icon
    return categoryIcons[service.category] || Globe;
  };

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || Grid;
  };

  const getStatusIcon = (status: string) => {
    return statusIcons[status] || Clock;
  };

  const onlineCount = services.filter((s) => s.status === "online").length;
  const offlineCount = services.filter((s) => s.status === "offline").length;
  const errorCount = services.filter((s) => s.status === "error").length;

  // Group services by category
  const groupedServices = filteredServices.reduce(
    (acc, service) => {
      const category = service.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    },
    {} as Record<string, Service[]>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
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
            <Globe className="h-7 w-7 text-primary" />
            Services
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your homelab services
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {user?.role === "admin" && (
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{services.length}</p>
              </div>
              <Globe className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-emerald-400">{onlineCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-red-400">{offlineCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-amber-400">{errorCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Services by Category */}
      {filteredServices.length === 0 ? (
        <Card className="p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No services found</h3>
          <p className="text-muted-foreground mt-1">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Add your first service to get started"}
          </p>
          {!searchQuery && categoryFilter === "all" && statusFilter === "all" && user?.role === "admin" && (
            <Button onClick={handleAdd} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add Service
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([category, categoryServices]) => {
            const CategoryIcon = getCategoryIcon(category);
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">
                    {categoryLabels[category] || category}
                  </h2>
                  <Badge variant="outline" className="ml-2">
                    {categoryServices.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryServices.map((service) => {
                    const ServiceIcon = getServiceIcon(service);
                    const StatusIcon = getStatusIcon(service.status);
                    return (
                      <LinkPreview
                        key={service.id}
                        url={service.url}
                        as="div"
                        className="h-full"
                      >
                        <Card
                          className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer h-full"
                          onClick={() => openService(service.url)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-lg ${service.status === "online"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : service.status === "error"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-gray-500/20 text-gray-400"
                                    }`}
                                >
                                  <ServiceIcon className="h-5 w-5" />
                                </div>
                                <div>
                                  <CardTitle className="text-base font-semibold">
                                    {service.name}
                                  </CardTitle>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openService(service.url); }}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCheckHealth(service.id); }}>
                                    <Activity className="h-4 w-4 mr-2" />
                                    Check Health
                                  </DropdownMenuItem>
                                  {user?.role === "admin" && (
                                    <>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(service); }}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); handleDelete(service); }}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-xs text-muted-foreground font-mono truncate">
                              {service.url}
                            </p>
                            <div className="flex items-center justify-between">
                              <Badge className={statusColors[service.status] || statusColors.unknown}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {service.status}
                              </Badge>
                              {service.responseTime > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {service.responseTime}ms
                                </span>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {service.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </LinkPreview>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Service Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Add a new service to monitor
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Portainer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="http://192.168.1.10:9000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Docker management UI"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service information</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL *</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedService?.name}"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
