package models

import "time"

// SystemMetrics represents overall system metrics
type SystemMetrics struct {
	CPU       CPUMetrics       `json:"cpu"`
	Memory    MemoryMetrics    `json:"memory"`
	Disk      []DiskMetrics    `json:"disk"`
	Network   []NetworkMetrics `json:"network"`
	Uptime    uint64           `json:"uptime"`
	Timestamp time.Time        `json:"timestamp"`
}

// CPUMetrics represents CPU usage information
type CPUMetrics struct {
	UsagePercent float64   `json:"usagePercent"`
	Cores        int       `json:"cores"`
	LogicalCores int       `json:"logicalCores"`
	ModelName    string    `json:"modelName"`
	Frequency    float64   `json:"frequency"`
	PerCoreUsage []float64 `json:"perCoreUsage"`
	Temperature  float64   `json:"temperature,omitempty"`
	LoadAverage  []float64 `json:"loadAverage,omitempty"`
}

// MemoryMetrics represents memory usage information
type MemoryMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"usedPercent"`
	SwapTotal   uint64  `json:"swapTotal"`
	SwapUsed    uint64  `json:"swapUsed"`
	SwapFree    uint64  `json:"swapFree"`
	SwapPercent float64 `json:"swapPercent"`
}

// DiskMetrics represents disk usage information
type DiskMetrics struct {
	Device      string  `json:"device"`
	MountPoint  string  `json:"mountPoint"`
	Fstype      string  `json:"fstype"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"usedPercent"`
	ReadBytes   uint64  `json:"readBytes"`
	WriteBytes  uint64  `json:"writeBytes"`
}

// NetworkMetrics represents network interface information
type NetworkMetrics struct {
	Interface   string `json:"interface"`
	BytesSent   uint64 `json:"bytesSent"`
	BytesRecv   uint64 `json:"bytesRecv"`
	PacketsSent uint64 `json:"packetsSent"`
	PacketsRecv uint64 `json:"packetsRecv"`
	ErrorsIn    uint64 `json:"errorsIn"`
	ErrorsOut   uint64 `json:"errorsOut"`
	DropIn      uint64 `json:"dropIn"`
	DropOut     uint64 `json:"dropOut"`
}

// MetricsHistory stores historical metrics data
type MetricsHistory struct {
	Timestamp   time.Time `json:"timestamp"`
	CPUUsage    float64   `json:"cpuUsage"`
	MemoryUsage float64   `json:"memoryUsage"`
	DiskUsage   float64   `json:"diskUsage"`
	NetworkIn   uint64    `json:"networkIn"`
	NetworkOut  uint64    `json:"networkOut"`
}
