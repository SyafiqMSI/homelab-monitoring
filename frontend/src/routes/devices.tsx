import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { api, type Device } from "@/lib/api";
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
    Monitor,
    Laptop,
    Server,
    Smartphone,
    Tablet,
    Camera,
    Router,
    HelpCircle,
    Plus,
    Search,
    RefreshCw,
    MoreVertical,
    Pencil,
    Trash2,
    Wifi,
    WifiOff,
    Loader2,
    MapPin,
} from "lucide-react";

export const Route = createFileRoute("/devices")({
    component: DevicesPage,
});

// Device type icons mapping
const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    pc: Monitor,
    laptop: Laptop,
    server: Server,
    phone: Smartphone,
    tablet: Tablet,
    cctv: Camera,
    router: Router,
    other: HelpCircle,
};

const deviceTypeLabels: Record<string, string> = {
    pc: "PC / Desktop",
    laptop: "Laptop",
    server: "Server",
    phone: "Phone",
    tablet: "Tablet",
    cctv: "CCTV / Camera",
    router: "Router / Network",
    other: "Other",
};

function DevicesPage() {
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const [devices, setDevices] = useState<Device[]>([]);
    const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        ip: "",
        mac: "",
        type: "pc",
        brand: "",
        model: "",
        location: "",
        description: "",
    });

    const fetchDevices = useCallback(async () => {
        try {
            const data = await api.getDevices();
            setDevices(data);
        } catch (error) {
            console.error("Failed to fetch devices:", error);
            toast.error("Failed to fetch devices");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchDevices();
        }
    }, [fetchDevices, isAuthenticated, authLoading]);

    // Filter devices
    useEffect(() => {
        let result = devices;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (d) =>
                    d.name.toLowerCase().includes(query) ||
                    d.ip.toLowerCase().includes(query) ||
                    d.brand?.toLowerCase().includes(query) ||
                    d.model?.toLowerCase().includes(query)
            );
        }

        if (typeFilter !== "all") {
            result = result.filter((d) => d.type === typeFilter);
        }

        setFilteredDevices(result);
    }, [devices, searchQuery, typeFilter]);

    // Fast fetch without ping (initial load)
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            // Use refresh=true to ping all devices and get live status
            const data = await api.getDevices(true);
            setDevices(data);
            toast.success("Devices refreshed with live status");
        } catch (error) {
            toast.error("Failed to refresh devices");
        } finally {
            setIsRefreshing(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            ip: "",
            mac: "",
            type: "pc",
            brand: "",
            model: "",
            location: "",
            description: "",
        });
    };

    const handleAdd = () => {
        resetForm();
        setIsAddDialogOpen(true);
    };

    const handleEdit = (device: Device) => {
        setSelectedDevice(device);
        setFormData({
            name: device.name,
            ip: device.ip,
            mac: device.mac || "",
            type: device.type,
            brand: device.brand || "",
            model: device.model || "",
            location: device.location || "",
            description: device.description || "",
        });
        setIsEditDialogOpen(true);
    };

    const handleDelete = (device: Device) => {
        setSelectedDevice(device);
        setIsDeleteDialogOpen(true);
    };

    const handleSaveNew = async () => {
        if (!formData.name || !formData.ip || !formData.type) {
            toast.error("Please fill in required fields");
            return;
        }

        setIsSaving(true);
        try {
            await api.createDevice(formData);
            toast.success("Device added successfully");
            setIsAddDialogOpen(false);
            fetchDevices();
        } catch (error) {
            toast.error("Failed to add device");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedDevice || !formData.name || !formData.ip) {
            toast.error("Please fill in required fields");
            return;
        }

        setIsSaving(true);
        try {
            await api.updateDevice(selectedDevice.id, formData);
            toast.success("Device updated successfully");
            setIsEditDialogOpen(false);
            fetchDevices();
        } catch (error) {
            toast.error("Failed to update device");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedDevice) return;

        try {
            await api.deleteDevice(selectedDevice.id);
            toast.success("Device deleted successfully");
            setIsDeleteDialogOpen(false);
            fetchDevices();
        } catch (error) {
            toast.error("Failed to delete device");
        }
    };

    const handlePing = async (deviceId: number) => {
        try {
            const result = await api.pingDevice(deviceId);
            if (result.online) {
                toast.success("Device is online!");
            } else {
                toast.error("Device is offline");
            }
            fetchDevices();
        } catch (error) {
            toast.error("Failed to ping device");
        }
    };

    const getDeviceIcon = (type: string) => {
        const Icon = deviceIcons[type] || HelpCircle;
        return Icon;
    };

    const onlineCount = devices.filter((d) => d.isOnline).length;
    const offlineCount = devices.filter((d) => !d.isOnline).length;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
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
                        <Server className="h-7 w-7 text-primary" />
                        Network Devices
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and monitor your network devices
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
                            Add Device
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
                                <p className="text-2xl font-bold">{devices.length}</p>
                            </div>
                            <Server className="h-8 w-8 text-primary opacity-50" />
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
                            <Wifi className="h-8 w-8 text-emerald-400 opacity-50" />
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
                            <WifiOff className="h-8 w-8 text-red-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Types</p>
                                <p className="text-2xl font-bold text-blue-400">
                                    {new Set(devices.map((d) => d.type)).size}
                                </p>
                            </div>
                            <Monitor className="h-8 w-8 text-blue-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search devices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(deviceTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Devices Grid */}
            {filteredDevices.length === 0 ? (
                <Card className="p-12 text-center">
                    <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No devices found</h3>
                    <p className="text-muted-foreground mt-1">
                        {searchQuery || typeFilter !== "all"
                            ? "Try adjusting your filters"
                            : "Add your first device to get started"}
                    </p>
                    {!searchQuery && typeFilter === "all" && user?.role === "admin" && (
                        <Button onClick={handleAdd} className="mt-4 gap-2">
                            <Plus className="h-4 w-4" />
                            Add Device
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDevices.map((device) => {
                        const DeviceIcon = getDeviceIcon(device.type);
                        return (
                            <Card
                                key={device.id}
                                className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50"
                            >
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
                                                <CardTitle className="text-base font-semibold">
                                                    {device.name}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {device.ip}
                                                </p>
                                            </div>
                                        </div>
                                        {user?.role === "admin" && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePing(device.id)}>
                                                        <Wifi className="h-4 w-4 mr-2" />
                                                        Ping
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(device)}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(device)}
                                                        className="text-red-500"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="capitalize">
                                            {deviceTypeLabels[device.type] || device.type}
                                        </Badge>
                                        <Badge
                                            className={
                                                device.isOnline
                                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                            }
                                        >
                                            {device.isOnline ? "Online" : "Offline"}
                                        </Badge>
                                    </div>

                                    {(device.brand || device.model) && (
                                        <p className="text-sm text-muted-foreground">
                                            {[device.brand, device.model].filter(Boolean).join(" ")}
                                        </p>
                                    )}

                                    {device.location && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            {device.location}
                                        </div>
                                    )}

                                    {device.mac && (
                                        <p className="text-xs text-muted-foreground font-mono">
                                            MAC: {device.mac}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Device Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add New Device</DialogTitle>
                        <DialogDescription>
                            Add a new device to your network inventory
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="My Device"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="type">Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(deviceTypeLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ip">IP Address *</Label>
                                <Input
                                    id="ip"
                                    value={formData.ip}
                                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                                    placeholder="192.168.1.100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mac">MAC Address</Label>
                                <Input
                                    id="mac"
                                    value={formData.mac}
                                    onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                                    placeholder="AA:BB:CC:DD:EE:FF"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <Input
                                    id="brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                    placeholder="Apple"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Input
                                    id="model"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    placeholder="MacBook Pro"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Living Room"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveNew} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Add Device
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Device Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Device</DialogTitle>
                        <DialogDescription>Update device information</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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
                                <Label htmlFor="edit-type">Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(deviceTypeLabels).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-ip">IP Address *</Label>
                                <Input
                                    id="edit-ip"
                                    value={formData.ip}
                                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-mac">MAC Address</Label>
                                <Input
                                    id="edit-mac"
                                    value={formData.mac}
                                    onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-brand">Brand</Label>
                                <Input
                                    id="edit-brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-model">Model</Label>
                                <Input
                                    id="edit-model"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-location">Location</Label>
                            <Input
                                id="edit-location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
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
                        <AlertDialogTitle>Delete Device</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{selectedDevice?.name}"? This action cannot
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
