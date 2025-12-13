package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/homelab/backend/models"
)

// DockerService handles Docker container operations using the Docker SDK
type DockerService struct {
	client     *client.Client
	ctx        context.Context
	statsCache map[string]cachedStats
	cacheMutex sync.RWMutex
}

type cachedStats struct {
	stats     models.ContainerStats
	timestamp time.Time
}

const statsCacheTTL = 5 * time.Second // Cache stats for 5 seconds

// NewDockerService creates a new DockerService with real Docker connection
func NewDockerService() *DockerService {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		fmt.Printf("Warning: Failed to connect to Docker: %v\n", err)
		fmt.Println("Container features will be disabled.")
		return &DockerService{client: nil, ctx: context.Background(), statsCache: make(map[string]cachedStats)}
	}

	return &DockerService{
		client:     cli,
		ctx:        context.Background(),
		statsCache: make(map[string]cachedStats),
	}
}

// IsConnected checks if Docker is available
func (s *DockerService) IsConnected() bool {
	return s.client != nil
}

// GetContainers returns all containers (optimized - no stats by default)
func (s *DockerService) GetContainers() []models.Container {
	if s.client == nil {
		return []models.Container{}
	}

	containers, err := s.client.ContainerList(s.ctx, container.ListOptions{All: true})
	if err != nil {
		fmt.Printf("Error listing containers: %v\n", err)
		return []models.Container{}
	}

	result := make([]models.Container, len(containers))
	var wg sync.WaitGroup

	for i, c := range containers {
		wg.Add(1)
		go func(idx int, ctr types.Container) {
			defer wg.Done()
			container := s.convertContainer(ctr)

			// Only get stats for running containers
			if ctr.State == "running" {
				container.Stats = s.getCachedStats(ctr.ID)
			}

			result[idx] = container
		}(i, c)
	}

	wg.Wait()
	return result
}

// GetContainersBasic returns containers without stats (fast)
func (s *DockerService) GetContainersBasic() []models.Container {
	if s.client == nil {
		return []models.Container{}
	}

	containers, err := s.client.ContainerList(s.ctx, container.ListOptions{All: true})
	if err != nil {
		fmt.Printf("Error listing containers: %v\n", err)
		return []models.Container{}
	}

	result := make([]models.Container, 0, len(containers))
	for _, c := range containers {
		result = append(result, s.convertContainer(c))
	}

	return result
}

// getCachedStats returns cached stats or fetches new ones
func (s *DockerService) getCachedStats(containerID string) models.ContainerStats {
	s.cacheMutex.RLock()
	cached, exists := s.statsCache[containerID]
	s.cacheMutex.RUnlock()

	if exists && time.Since(cached.timestamp) < statsCacheTTL {
		return cached.stats
	}

	// Fetch new stats
	stats := s.getContainerStats(containerID)

	// Update cache
	s.cacheMutex.Lock()
	s.statsCache[containerID] = cachedStats{
		stats:     stats,
		timestamp: time.Now(),
	}
	s.cacheMutex.Unlock()

	return stats
}

// GetContainer returns a specific container by ID
func (s *DockerService) GetContainer(id string) (*models.Container, error) {
	if s.client == nil {
		return nil, fmt.Errorf("docker not connected")
	}

	containerJSON, err := s.client.ContainerInspect(s.ctx, id)
	if err != nil {
		return nil, fmt.Errorf("container not found: %s", id)
	}

	container := s.convertContainerInspect(containerJSON)
	if containerJSON.State != nil && containerJSON.State.Running {
		container.Stats = s.getCachedStats(id)
	}

	return &container, nil
}

// StartContainer starts a container
func (s *DockerService) StartContainer(id string) error {
	if s.client == nil {
		return fmt.Errorf("docker not connected")
	}

	return s.client.ContainerStart(s.ctx, id, container.StartOptions{})
}

// StopContainer stops a container
func (s *DockerService) StopContainer(id string) error {
	if s.client == nil {
		return fmt.Errorf("docker not connected")
	}

	timeout := 10
	return s.client.ContainerStop(s.ctx, id, container.StopOptions{Timeout: &timeout})
}

// RestartContainer restarts a container
func (s *DockerService) RestartContainer(id string) error {
	if s.client == nil {
		return fmt.Errorf("docker not connected")
	}

	timeout := 10
	return s.client.ContainerRestart(s.ctx, id, container.StopOptions{Timeout: &timeout})
}

// convertContainer converts Docker API container to our model
func (s *DockerService) convertContainer(c types.Container) models.Container {
	name := ""
	if len(c.Names) > 0 {
		name = strings.TrimPrefix(c.Names[0], "/")
	}

	ports := make([]models.ContainerPort, 0, len(c.Ports))
	for _, p := range c.Ports {
		ports = append(ports, models.ContainerPort{
			IP:          p.IP,
			PrivatePort: int(p.PrivatePort),
			PublicPort:  int(p.PublicPort),
			Type:        p.Type,
		})
	}

	mounts := make([]models.ContainerMount, 0, len(c.Mounts))
	for _, m := range c.Mounts {
		mounts = append(mounts, models.ContainerMount{
			Type:        string(m.Type),
			Name:        m.Name,
			Source:      m.Source,
			Destination: m.Destination,
			RW:          m.RW,
		})
	}

	health := ""
	if c.State == "running" {
		health = "healthy"
	}

	return models.Container{
		ID:          c.ID[:12],
		Name:        name,
		Image:       c.Image,
		ImageID:     c.ImageID,
		Command:     c.Command,
		Created:     time.Unix(c.Created, 0),
		State:       c.State,
		Status:      c.Status,
		Ports:       ports,
		Labels:      c.Labels,
		NetworkMode: c.HostConfig.NetworkMode,
		Mounts:      mounts,
		Health:      health,
	}
}

// convertContainerInspect converts Docker API container inspect to our model
func (s *DockerService) convertContainerInspect(c types.ContainerJSON) models.Container {
	ports := make([]models.ContainerPort, 0)
	if c.NetworkSettings != nil {
		for portKey, bindings := range c.NetworkSettings.Ports {
			for _, binding := range bindings {
				port := 0
				if binding.HostPort != "" {
					fmt.Sscanf(binding.HostPort, "%d", &port)
				}
				ports = append(ports, models.ContainerPort{
					IP:          binding.HostIP,
					PrivatePort: int(portKey.Int()),
					PublicPort:  port,
					Type:        portKey.Proto(),
				})
			}
		}
	}

	mounts := make([]models.ContainerMount, 0)
	if c.Mounts != nil {
		for _, m := range c.Mounts {
			mounts = append(mounts, models.ContainerMount{
				Type:        string(m.Type),
				Name:        m.Name,
				Source:      m.Source,
				Destination: m.Destination,
				RW:          m.RW,
			})
		}
	}

	health := ""
	if c.State != nil {
		if c.State.Health != nil {
			health = c.State.Health.Status
		} else if c.State.Running {
			health = "healthy"
		}
	}

	state := ""
	status := ""
	var createdTime time.Time
	if c.State != nil {
		state = c.State.Status
		if c.State.Running {
			startedAt, _ := time.Parse(time.RFC3339Nano, c.State.StartedAt)
			status = fmt.Sprintf("Up %s", formatDuration(time.Since(startedAt)))
		} else {
			finishedAt, _ := time.Parse(time.RFC3339Nano, c.State.FinishedAt)
			status = fmt.Sprintf("Exited (%d) %s ago", c.State.ExitCode, formatDuration(time.Since(finishedAt)))
		}
	}

	// Parse created time
	createdTime, _ = time.Parse(time.RFC3339Nano, c.Created)

	networkMode := ""
	if c.HostConfig != nil {
		networkMode = string(c.HostConfig.NetworkMode)
	}

	return models.Container{
		ID:          c.ID[:12],
		Name:        strings.TrimPrefix(c.Name, "/"),
		Image:       c.Config.Image,
		ImageID:     c.Image,
		Command:     strings.Join(c.Config.Cmd, " "),
		Created:     createdTime,
		State:       state,
		Status:      status,
		Ports:       ports,
		Labels:      c.Config.Labels,
		NetworkMode: networkMode,
		Mounts:      mounts,
		Health:      health,
	}
}

// getContainerStats gets real-time stats for a container
func (s *DockerService) getContainerStats(containerID string) models.ContainerStats {
	if s.client == nil {
		return models.ContainerStats{}
	}

	// Get container stats with streaming to get proper CPU delta
	ctx, cancel := context.WithTimeout(s.ctx, 3*time.Second)
	defer cancel()

	// Use stream=true to get multiple samples for accurate CPU calculation
	stats, err := s.client.ContainerStats(ctx, containerID, true)
	if err != nil {
		return models.ContainerStats{}
	}
	defer stats.Body.Close()

	// Read the first complete JSON object from the stream
	decoder := json.NewDecoder(stats.Body)
	var statsJSON types.StatsJSON
	if err := decoder.Decode(&statsJSON); err != nil {
		return models.ContainerStats{}
	}

	// Calculate CPU percentage
	cpuPercent := calculateCPUPercent(&statsJSON)

	// Calculate memory percentage
	memoryPercent := 0.0
	memoryUsage := statsJSON.MemoryStats.Usage
	memoryLimit := statsJSON.MemoryStats.Limit

	// For Linux, subtract cache from memory usage
	if cache, ok := statsJSON.MemoryStats.Stats["cache"]; ok {
		memoryUsage -= cache
	}

	if memoryLimit > 0 {
		memoryPercent = float64(memoryUsage) / float64(memoryLimit) * 100.0
	}

	// Calculate network I/O
	var networkRx, networkTx uint64
	for _, v := range statsJSON.Networks {
		networkRx += v.RxBytes
		networkTx += v.TxBytes
	}

	// Calculate block I/O
	var blockRead, blockWrite uint64
	for _, v := range statsJSON.BlkioStats.IoServiceBytesRecursive {
		if v.Op == "Read" {
			blockRead += v.Value
		} else if v.Op == "Write" {
			blockWrite += v.Value
		}
	}

	return models.ContainerStats{
		CPUPercent:    cpuPercent,
		MemoryUsage:   int64(statsJSON.MemoryStats.Usage),
		MemoryLimit:   int64(statsJSON.MemoryStats.Limit),
		MemoryPercent: memoryPercent,
		NetworkRx:     int64(networkRx),
		NetworkTx:     int64(networkTx),
		BlockRead:     int64(blockRead),
		BlockWrite:    int64(blockWrite),
		PIDs:          int(statsJSON.PidsStats.Current),
	}
}

// formatDuration formats a duration in a human-readable way
func formatDuration(d time.Duration) string {
	if d < time.Minute {
		return fmt.Sprintf("%d seconds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%d minutes", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%d hours", int(d.Hours()))
	}
	return fmt.Sprintf("%d days", int(d.Hours()/24))
}

// calculateCPUPercent calculates CPU percentage from container stats
func calculateCPUPercent(stats *types.StatsJSON) float64 {
	cpuPercent := 0.0

	// Calculate CPU usage delta
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)

	if systemDelta > 0 && cpuDelta > 0 {
		numCPUs := float64(stats.CPUStats.OnlineCPUs)
		if numCPUs == 0 {
			numCPUs = float64(len(stats.CPUStats.CPUUsage.PercpuUsage))
		}
		if numCPUs == 0 {
			numCPUs = 1
		}
		cpuPercent = (cpuDelta / systemDelta) * numCPUs * 100.0
	}

	return cpuPercent
}
