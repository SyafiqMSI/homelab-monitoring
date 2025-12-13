package models

import "time"

// Container represents a Docker container
type Container struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Image       string            `json:"image"`
	ImageID     string            `json:"imageId"`
	Command     string            `json:"command"`
	Created     time.Time         `json:"created"`
	State       string            `json:"state"`
	Status      string            `json:"status"`
	Ports       []ContainerPort   `json:"ports"`
	Labels      map[string]string `json:"labels"`
	NetworkMode string            `json:"networkMode"`
	Mounts      []ContainerMount  `json:"mounts"`
	Stats       ContainerStats    `json:"stats,omitempty"`
	Health      string            `json:"health,omitempty"`
}

// ContainerPort represents a port mapping
type ContainerPort struct {
	IP          string `json:"ip"`
	PrivatePort int    `json:"privatePort"`
	PublicPort  int    `json:"publicPort"`
	Type        string `json:"type"`
}

// ContainerMount represents a volume mount
type ContainerMount struct {
	Type        string `json:"type"`
	Name        string `json:"name"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Mode        string `json:"mode"`
	RW          bool   `json:"rw"`
}

// ContainerStats represents container resource usage
type ContainerStats struct {
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryUsage   int64   `json:"memoryUsage"`
	MemoryLimit   int64   `json:"memoryLimit"`
	MemoryPercent float64 `json:"memoryPercent"`
	NetworkRx     int64   `json:"networkRx"`
	NetworkTx     int64   `json:"networkTx"`
	BlockRead     int64   `json:"blockRead"`
	BlockWrite    int64   `json:"blockWrite"`
	PIDs          int     `json:"pids"`
}

// ContainerAction represents an action to perform on a container
type ContainerAction struct {
	Action string `json:"action"` // start, stop, restart, pause, unpause, remove
}
