// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const WS_BASE_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws";

// Types
export interface SystemMetrics {
    cpu: CPUMetrics;
    memory: MemoryMetrics;
    disk: DiskMetrics[];
    network: NetworkMetrics[];
    uptime: number;
    timestamp: string;
}

export interface CPUMetrics {
    usagePercent: number;
    cores: number;
    logicalCores: number;
    modelName: string;
    frequency: number;
    perCoreUsage: number[];
    temperature?: number;
    loadAverage?: number[];
}

export interface MemoryMetrics {
    total: number;
    used: number;
    free: number;
    available: number;
    usedPercent: number;
    swapTotal: number;
    swapUsed: number;
    swapFree: number;
    swapPercent: number;
}

export interface DiskMetrics {
    device: string;
    mountPoint: string;
    fstype: string;
    total: number;
    used: number;
    free: number;
    usedPercent: number;
    readBytes: number;
    writeBytes: number;
}

export interface NetworkMetrics {
    interface: string;
    bytesSent: number;
    bytesRecv: number;
    packetsSent: number;
    packetsRecv: number;
    errorsIn: number;
    errorsOut: number;
    dropIn: number;
    dropOut: number;
}

export interface MetricsHistory {
    timestamp: string;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIn: number;
    networkOut: number;
}

export interface Container {
    id: string;
    name: string;
    image: string;
    imageId: string;
    command: string;
    created: string;
    state: string;
    status: string;
    ports: ContainerPort[];
    labels: Record<string, string>;
    networkMode: string;
    mounts: ContainerMount[];
    stats: ContainerStats;
    health: string;
}

export interface ContainerPort {
    ip: string;
    privatePort: number;
    publicPort: number;
    type: string;
}

export interface ContainerMount {
    type: string;
    name: string;
    source: string;
    destination: string;
    mode: string;
    rw: boolean;
}

export interface ContainerStats {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    networkRx: number;
    networkTx: number;
    blockRead: number;
    blockWrite: number;
    pids: number;
}

export interface Device {
    id: number;
    userId: number;
    name: string;
    ip: string;
    mac?: string;
    type: string;
    brand?: string;
    model?: string;
    icon?: string;
    location?: string;
    description?: string;
    isOnline: boolean;
    lastSeen?: string;
    isActive: boolean;
    // SSH fields for remote shutdown
    sshUser?: string;
    sshPassword?: string;
    sshPort?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateDeviceRequest {
    name: string;
    ip: string;
    mac?: string;
    type: string;
    brand?: string;
    model?: string;
    icon?: string;
    location?: string;
    description?: string;
    // SSH fields for remote shutdown
    sshUser?: string;
    sshPassword?: string;
    sshPort?: number;
}

export interface Server {
    id: string;
    name: string;
    hostname: string;
    ip: string;
    port: number;
    type: string;
    icon: string;
    status: string;
    description: string;
    tags: string[];
    location: string;
    createdAt: string;
    updatedAt: string;
    lastSeen: string;
    metrics?: SystemMetrics;
}

export interface Service {
    id: number;
    name: string;
    url: string;
    icon: string;
    category: string;
    description: string;
    status: string; // online, offline, error, disabled, unknown
    statusCode: number;
    responseTime: number;
    uptimePercent: number;
    lastCheck: string;
    isActive: boolean;
}

export interface CreateServiceRequest {
    name: string;
    url: string;
    method?: string;
    port?: number;
    icon?: string;
    category?: string;
    description?: string;
    checkInterval?: number;
    timeout?: number;
    expectedCode?: number;
}

export interface ServiceHealth {
    id: number;
    name: string;
    status: string;
    statusCode?: number;
    responseTime: number;
    lastCheck: string;
}

// Auth types
export interface User {
    id: number;
    email: string;
    username: string;
    name: string;
    avatar: string;
    role: string;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
    name: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
}

// Token storage
const TOKEN_KEY = "homelab_token";
const USER_KEY = "homelab_user";

export function getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
    return !!getStoredToken();
}

// API Client
class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getAuthHeader(): Record<string, string> {
        const token = getStoredToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...this.getAuthHeader(),
                ...options?.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                const currentPath = window.location.pathname;
                if (currentPath !== "/login" && currentPath !== "/register") {
                    removeStoredToken();
                    window.location.href = "/login";
                }
            }
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Auth
    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
        setStoredToken(response.accessToken);
        setStoredUser(response.user);
        return response;
    }

    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await this.request<AuthResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
        setStoredToken(response.accessToken);
        setStoredUser(response.user);
        return response;
    }

    async logout(): Promise<void> {
        try {
            await this.request("/auth/logout", { method: "POST" });
        } finally {
            removeStoredToken();
        }
    }

    async getProfile(): Promise<User> {
        return this.request<User>("/auth/profile");
    }

    async validateToken(): Promise<{ valid: boolean; user?: User }> {
        return this.request<{ valid: boolean; user?: User }>("/auth/validate");
    }

    // Metrics
    async getSystemMetrics(): Promise<SystemMetrics> {
        return this.request<SystemMetrics>("/metrics");
    }

    async getCPUMetrics(): Promise<CPUMetrics> {
        return this.request<CPUMetrics>("/metrics/cpu");
    }

    async getMemoryMetrics(): Promise<MemoryMetrics> {
        return this.request<MemoryMetrics>("/metrics/memory");
    }

    async getDiskMetrics(): Promise<DiskMetrics[]> {
        return this.request<DiskMetrics[]>("/metrics/disk");
    }

    async getNetworkMetrics(): Promise<NetworkMetrics[]> {
        return this.request<NetworkMetrics[]>("/metrics/network");
    }

    async getMetricsHistory(limit = 50): Promise<MetricsHistory[]> {
        return this.request<MetricsHistory[]>(`/metrics/history?limit=${limit}`);
    }

    // Containers
    async getContainers(): Promise<Container[]> {
        return this.request<Container[]>("/containers");
    }

    async getContainer(id: string): Promise<Container> {
        return this.request<Container>(`/containers/${id}`);
    }

    async startContainer(id: string): Promise<void> {
        await this.request(`/containers/${id}/start`, { method: "POST" });
    }

    async stopContainer(id: string): Promise<void> {
        await this.request(`/containers/${id}/stop`, { method: "POST" });
    }

    async restartContainer(id: string): Promise<void> {
        await this.request(`/containers/${id}/restart`, { method: "POST" });
    }

    // Servers (legacy, kept for compatibility)
    async getServers(): Promise<Server[]> {
        return this.request<Server[]>("/servers");
    }

    async getServer(id: string): Promise<Server> {
        return this.request<Server>(`/servers/${id}`);
    }

    async pingServer(id: string): Promise<ServiceHealth> {
        return this.request<ServiceHealth>(`/servers/${id}/ping`);
    }

    // Devices
    async getDevices(refresh = false): Promise<Device[]> {
        const query = refresh ? "?refresh=true" : "";
        return this.request<Device[]>(`/devices${query}`);
    }

    async getDevice(id: number): Promise<Device> {
        return this.request<Device>(`/devices/${id}`);
    }

    async createDevice(data: CreateDeviceRequest): Promise<Device> {
        return this.request<Device>("/devices", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async updateDevice(id: number, data: Partial<CreateDeviceRequest>): Promise<Device> {
        return this.request<Device>(`/devices/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    async deleteDevice(id: number): Promise<void> {
        await this.request(`/devices/${id}`, { method: "DELETE" });
    }

    async pingDevice(id: number): Promise<{ online: boolean }> {
        return this.request<{ online: boolean }>(`/devices/${id}/ping`);
    }

    async wakeDevice(id: number): Promise<void> {
        await this.request(`/devices/${id}/wake`, { method: "POST" });
    }

    async shutdownDevice(id: number): Promise<void> {
        await this.request(`/devices/${id}/shutdown`, { method: "POST" });
    }

    // Services
    async getServices(refresh = false): Promise<Service[]> {
        const query = refresh ? "?refresh=true" : "";
        return this.request<Service[]>(`/services${query}`);
    }

    async getService(id: number): Promise<Service> {
        return this.request<Service>(`/services/${id}`);
    }

    async createService(data: CreateServiceRequest): Promise<Service> {
        return this.request<Service>("/services", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async updateService(id: number, data: Partial<CreateServiceRequest>): Promise<Service> {
        return this.request<Service>(`/services/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    async deleteService(id: number): Promise<void> {
        await this.request(`/services/${id}`, { method: "DELETE" });
    }

    async checkServiceHealth(id: number): Promise<ServiceHealth> {
        return this.request<ServiceHealth>(`/services/${id}/health`);
    }

    async getServiceCategories(): Promise<{ value: string; label: string; icon: string }[]> {
        return this.request(`/services/categories`);
    }

    // Network Tools
    async getPing(): Promise<{ latency: number; status: string; error?: string }> {
        return this.request("/network/ping");
    }

    async getSpeedTest(): Promise<{ downloadMbps: number }> {
        return this.request("/network/speedtest");
    }
}

// WebSocket for real-time metrics
export class MetricsWebSocket {
    private ws: WebSocket | null = null;
    private url: string;
    private onMessage: (metrics: SystemMetrics) => void;
    private onError?: (error: Event) => void;
    private onClose?: () => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    constructor(
        onMessage: (metrics: SystemMetrics) => void,
        onError?: (error: Event) => void,
        onClose?: () => void
    ) {
        this.url = `${WS_BASE_URL}/metrics`;
        this.onMessage = onMessage;
        this.onError = onError;
        this.onClose = onClose;
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log("WebSocket connected");
                this.reconnectAttempts = 0;
            };

            this.ws.onmessage = (event) => {
                try {
                    const metrics = JSON.parse(event.data) as SystemMetrics;
                    this.onMessage(metrics);
                } catch (e) {
                    console.error("Failed to parse metrics:", e);
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.onError?.(error);
            };

            this.ws.onclose = () => {
                console.log("WebSocket closed");
                this.onClose?.();
                this.attemptReconnect();
            };
        } catch (e) {
            console.error("Failed to connect WebSocket:", e);
            this.attemptReconnect();
        }
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Singleton instance
export const api = new ApiClient(API_BASE_URL);

// Utility functions
export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(" ") || "0m";
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}
