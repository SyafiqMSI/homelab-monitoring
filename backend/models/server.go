package models

import "time"

// Server represents a monitored server/machine
type Server struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Hostname    string         `json:"hostname"`
	IP          string         `json:"ip"`
	Port        int            `json:"port"`
	Type        string         `json:"type"` // linux, windows, proxmox, esxi, nas
	Icon        string         `json:"icon"`
	Status      string         `json:"status"` // online, offline, warning
	Description string         `json:"description"`
	Tags        []string       `json:"tags"`
	Location    string         `json:"location"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	LastSeen    time.Time      `json:"lastSeen"`
	Metrics     *SystemMetrics `json:"metrics,omitempty"`
}

// Service represents a monitored service
type Service struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	URL           string    `json:"url"`
	Method        string    `json:"method"` // GET, POST, TCP, PING
	Port          int       `json:"port"`
	Icon          string    `json:"icon"`
	Category      string    `json:"category"` // media, network, storage, security, productivity
	Status        string    `json:"status"`   // healthy, unhealthy, degraded, unknown
	StatusCode    int       `json:"statusCode,omitempty"`
	ResponseTime  int64     `json:"responseTime"` // in ms
	Description   string    `json:"description"`
	ServerID      string    `json:"serverId"`
	Tags          []string  `json:"tags"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	LastCheck     time.Time `json:"lastCheck"`
	UptimePercent float64   `json:"uptimePercent"`
}

// ServiceHealth represents a health check result
type ServiceHealth struct {
	ServiceID    string    `json:"serviceId"`
	Status       string    `json:"status"`
	StatusCode   int       `json:"statusCode,omitempty"`
	ResponseTime int64     `json:"responseTime"`
	Message      string    `json:"message,omitempty"`
	CheckedAt    time.Time `json:"checkedAt"`
}

// ServerCreate represents the request body for creating a server
type ServerCreate struct {
	Name        string   `json:"name" binding:"required"`
	Hostname    string   `json:"hostname" binding:"required"`
	IP          string   `json:"ip" binding:"required"`
	Port        int      `json:"port"`
	Type        string   `json:"type"`
	Icon        string   `json:"icon"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Location    string   `json:"location"`
}

// ServerUpdate represents the request body for updating a server
type ServerUpdate struct {
	Name        *string   `json:"name"`
	Hostname    *string   `json:"hostname"`
	IP          *string   `json:"ip"`
	Port        *int      `json:"port"`
	Type        *string   `json:"type"`
	Icon        *string   `json:"icon"`
	Description *string   `json:"description"`
	Tags        *[]string `json:"tags"`
	Location    *string   `json:"location"`
}
