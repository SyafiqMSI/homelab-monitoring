package models

import (
	"time"

	"gorm.io/gorm"
)

// Device represents a network device (PC, Server, Phone, CCTV, etc.)
type Device struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	UserID      uint           `json:"userId" gorm:"not null;index"`
	Name        string         `json:"name" gorm:"size:255;not null"`
	IP          string         `json:"ip" gorm:"size:50;not null"`
	MAC         string         `json:"mac" gorm:"size:20"`
	Type        string         `json:"type" gorm:"size:50"` // pc, server, phone, cctv, router, other
	Brand       string         `json:"brand" gorm:"size:100"`
	Model       string         `json:"model" gorm:"size:100"`
	Icon        string         `json:"icon" gorm:"size:100"`
	Location    string         `json:"location" gorm:"size:255"`
	Description string         `json:"description" gorm:"size:500"`
	IsOnline    bool           `json:"isOnline" gorm:"default:false"`
	LastSeen    *time.Time     `json:"lastSeen"`
	IsActive    bool           `json:"isActive" gorm:"default:true"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
}

// DeviceType constants
var DeviceTypes = []string{"pc", "server", "phone", "cctv", "router", "tablet", "laptop", "other"}

// ServiceConfig represents a saved service configuration in the database
type ServiceConfig struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	UserID        uint           `json:"userId" gorm:"not null;index"`
	DeviceID      *uint          `json:"deviceId" gorm:"index"`
	Name          string         `json:"name" gorm:"size:255;not null"`
	URL           string         `json:"url" gorm:"size:500;not null"`
	Method        string         `json:"method" gorm:"size:10;default:GET"` // GET, POST, TCP, PING
	Port          int            `json:"port"`
	Icon          string         `json:"icon" gorm:"size:100"`
	Category      string         `json:"category" gorm:"size:100"` // media, network, storage, security, productivity
	Description   string         `json:"description" gorm:"size:500"`
	Tags          string         `json:"tags" gorm:"size:500"`            // JSON array stored as string
	CheckInterval int            `json:"checkInterval" gorm:"default:60"` // in seconds
	Timeout       int            `json:"timeout" gorm:"default:10"`       // in seconds
	ExpectedCode  int            `json:"expectedCode" gorm:"default:200"`
	IsActive      bool           `json:"isActive" gorm:"default:true"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

// CreateDeviceRequest for creating a new device
type CreateDeviceRequest struct {
	Name        string `json:"name" binding:"required"`
	IP          string `json:"ip" binding:"required"`
	MAC         string `json:"mac"`
	Type        string `json:"type" binding:"required"`
	Brand       string `json:"brand"`
	Model       string `json:"model"`
	Icon        string `json:"icon"`
	Location    string `json:"location"`
	Description string `json:"description"`
}

// UpdateDeviceRequest for updating a device
type UpdateDeviceRequest struct {
	Name        *string `json:"name"`
	IP          *string `json:"ip"`
	MAC         *string `json:"mac"`
	Type        *string `json:"type"`
	Brand       *string `json:"brand"`
	Model       *string `json:"model"`
	Icon        *string `json:"icon"`
	Location    *string `json:"location"`
	Description *string `json:"description"`
	IsActive    *bool   `json:"isActive"`
}
