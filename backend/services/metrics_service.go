package services

import (
	"runtime"
	"sync"
	"time"

	"github.com/homelab/backend/models"
	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// MetricsService handles system metrics collection
type MetricsService struct {
	history    []models.MetricsHistory
	mu         sync.RWMutex
	maxHistory int
}

// NewMetricsService creates a new MetricsService
func NewMetricsService() *MetricsService {
	ms := &MetricsService{
		history:    make([]models.MetricsHistory, 0),
		maxHistory: 100,
	}

	// Start background collection
	go ms.collectHistoryBackground()

	return ms
}

func (s *MetricsService) collectHistoryBackground() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		<-ticker.C
		metrics, err := s.GetSystemMetrics()
		if err != nil {
			continue
		}

		var diskUsage float64
		if len(metrics.Disk) > 0 {
			diskUsage = metrics.Disk[0].UsedPercent
		}

		var networkIn, networkOut uint64
		for _, n := range metrics.Network {
			networkIn += n.BytesRecv
			networkOut += n.BytesSent
		}

		history := models.MetricsHistory{
			Timestamp:   time.Now(),
			CPUUsage:    metrics.CPU.UsagePercent,
			MemoryUsage: metrics.Memory.UsedPercent,
			DiskUsage:   diskUsage,
			NetworkIn:   networkIn,
			NetworkOut:  networkOut,
		}

		s.mu.Lock()
		s.history = append(s.history, history)
		if len(s.history) > s.maxHistory {
			s.history = s.history[1:]
		}
		s.mu.Unlock()
	}
}

// GetSystemMetrics returns comprehensive system metrics
func (s *MetricsService) GetSystemMetrics() (*models.SystemMetrics, error) {
	cpuMetrics, err := s.GetCPUMetrics()
	if err != nil {
		return nil, err
	}

	memMetrics, err := s.GetMemoryMetrics()
	if err != nil {
		return nil, err
	}

	diskMetrics, err := s.GetDiskMetrics()
	if err != nil {
		return nil, err
	}

	netMetrics, err := s.GetNetworkMetrics()
	if err != nil {
		return nil, err
	}

	uptime, _ := host.Uptime()

	return &models.SystemMetrics{
		CPU:       *cpuMetrics,
		Memory:    *memMetrics,
		Disk:      diskMetrics,
		Network:   netMetrics,
		Uptime:    uptime,
		Timestamp: time.Now(),
	}, nil
}

// GetCPUMetrics returns CPU-specific metrics
func (s *MetricsService) GetCPUMetrics() (*models.CPUMetrics, error) {
	percentages, err := cpu.Percent(time.Millisecond*200, true)
	if err != nil {
		return nil, err
	}

	overallPercent, err := cpu.Percent(time.Millisecond*200, false)
	if err != nil {
		return nil, err
	}

	var usagePercent float64
	if len(overallPercent) > 0 {
		usagePercent = overallPercent[0]
	}

	info, _ := cpu.Info()
	var modelName string
	var frequency float64
	if len(info) > 0 {
		modelName = info[0].ModelName
		frequency = info[0].Mhz
	}

	cores, _ := cpu.Counts(false)
	logicalCores, _ := cpu.Counts(true)

	return &models.CPUMetrics{
		UsagePercent: usagePercent,
		Cores:        cores,
		LogicalCores: logicalCores,
		ModelName:    modelName,
		Frequency:    frequency,
		PerCoreUsage: percentages,
	}, nil
}

// GetMemoryMetrics returns memory-specific metrics
func (s *MetricsService) GetMemoryMetrics() (*models.MemoryMetrics, error) {
	vmem, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	swap, _ := mem.SwapMemory()

	return &models.MemoryMetrics{
		Total:       vmem.Total,
		Used:        vmem.Used,
		Free:        vmem.Free,
		Available:   vmem.Available,
		UsedPercent: vmem.UsedPercent,
		SwapTotal:   swap.Total,
		SwapUsed:    swap.Used,
		SwapFree:    swap.Free,
		SwapPercent: swap.UsedPercent,
	}, nil
}

// GetDiskMetrics returns disk-specific metrics
func (s *MetricsService) GetDiskMetrics() ([]models.DiskMetrics, error) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil, err
	}

	var metrics []models.DiskMetrics
	ioStats, _ := disk.IOCounters()

	for _, p := range partitions {
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}

		// Skip special filesystems
		if usage.Total == 0 {
			continue
		}

		dm := models.DiskMetrics{
			Device:      p.Device,
			MountPoint:  p.Mountpoint,
			Fstype:      p.Fstype,
			Total:       usage.Total,
			Used:        usage.Used,
			Free:        usage.Free,
			UsedPercent: usage.UsedPercent,
		}

		// Add IO stats if available
		if io, ok := ioStats[p.Device]; ok {
			dm.ReadBytes = io.ReadBytes
			dm.WriteBytes = io.WriteBytes
		}

		metrics = append(metrics, dm)
	}

	return metrics, nil
}

// GetNetworkMetrics returns network-specific metrics
func (s *MetricsService) GetNetworkMetrics() ([]models.NetworkMetrics, error) {
	interfaces, err := net.IOCounters(true)
	if err != nil {
		return nil, err
	}

	var metrics []models.NetworkMetrics
	for _, iface := range interfaces {
		// Skip loopback on non-Windows systems
		if runtime.GOOS != "windows" && iface.Name == "lo" {
			continue
		}
		// Skip virtual interfaces
		if iface.BytesSent == 0 && iface.BytesRecv == 0 {
			continue
		}

		metrics = append(metrics, models.NetworkMetrics{
			Interface:   iface.Name,
			BytesSent:   iface.BytesSent,
			BytesRecv:   iface.BytesRecv,
			PacketsSent: iface.PacketsSent,
			PacketsRecv: iface.PacketsRecv,
			ErrorsIn:    iface.Errin,
			ErrorsOut:   iface.Errout,
			DropIn:      iface.Dropin,
			DropOut:     iface.Dropout,
		})
	}

	return metrics, nil
}

// GetMetricsHistory returns historical metrics data
func (s *MetricsService) GetMetricsHistory(limit int) []models.MetricsHistory {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 || limit > len(s.history) {
		limit = len(s.history)
	}

	start := len(s.history) - limit
	result := make([]models.MetricsHistory, limit)
	copy(result, s.history[start:])

	return result
}
