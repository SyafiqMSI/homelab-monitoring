package services

import (
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/homelab/backend/database"
	"github.com/homelab/backend/models"
	"gorm.io/gorm"
)

// DeviceService handles device operations
type DeviceService struct {
	db *gorm.DB
}

// NewDeviceService creates a new DeviceService
func NewDeviceService() *DeviceService {
	return &DeviceService{
		db: database.GetDB(),
	}
}

// GetDevices returns all devices for a user (fast - no ping)
func (s *DeviceService) GetDevices(userID uint) ([]models.Device, error) {
	var devices []models.Device
	if err := s.db.Where("user_id = ?", userID).Order("name ASC").Find(&devices).Error; err != nil {
		return nil, err
	}
	// Return devices with last known online status from database
	// User can manually ping or use PingAllDevices for live status
	return devices, nil
}

// GetDevicesWithPing returns all devices with live ping check (slower)
func (s *DeviceService) GetDevicesWithPing(userID uint) ([]models.Device, error) {
	var devices []models.Device
	if err := s.db.Where("user_id = ?", userID).Order("name ASC").Find(&devices).Error; err != nil {
		return nil, err
	}

	// Ping all devices in parallel
	var wg sync.WaitGroup
	for i := range devices {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			devices[idx].IsOnline = s.pingDeviceFast(devices[idx].IP)
			if devices[idx].IsOnline {
				now := time.Now()
				devices[idx].LastSeen = &now
				// Update in database
				s.db.Model(&devices[idx]).Updates(map[string]interface{}{
					"is_online": true,
					"last_seen": now,
				})
			} else {
				s.db.Model(&devices[idx]).Update("is_online", false)
			}
		}(i)
	}
	wg.Wait()

	return devices, nil
}

// GetDevice returns a single device by ID (no ping for speed)
func (s *DeviceService) GetDevice(id uint, userID uint) (*models.Device, error) {
	var device models.Device
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		return nil, fmt.Errorf("device not found")
	}
	return &device, nil
}

// CreateDevice creates a new device
func (s *DeviceService) CreateDevice(userID uint, req models.CreateDeviceRequest) (*models.Device, error) {
	device := models.Device{
		UserID:      userID,
		Name:        req.Name,
		IP:          req.IP,
		MAC:         req.MAC,
		Type:        req.Type,
		Brand:       req.Brand,
		Model:       req.Model,
		Icon:        req.Icon,
		Location:    req.Location,
		Description: req.Description,
		IsActive:    true,
		IsOnline:    false, // Will be updated when user pings
	}

	// Set default icon based on type
	if device.Icon == "" {
		device.Icon = getDefaultIcon(device.Type)
	}

	if err := s.db.Create(&device).Error; err != nil {
		return nil, err
	}

	// Quick ping to set initial status
	device.IsOnline = s.pingDeviceFast(device.IP)
	if device.IsOnline {
		now := time.Now()
		device.LastSeen = &now
		s.db.Model(&device).Updates(map[string]interface{}{
			"is_online": true,
			"last_seen": now,
		})
	}

	return &device, nil
}

// UpdateDevice updates a device
func (s *DeviceService) UpdateDevice(id uint, userID uint, req models.UpdateDeviceRequest) (*models.Device, error) {
	var device models.Device
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		return nil, fmt.Errorf("device not found")
	}

	if req.Name != nil {
		device.Name = *req.Name
	}
	if req.IP != nil {
		device.IP = *req.IP
	}
	if req.MAC != nil {
		device.MAC = *req.MAC
	}
	if req.Type != nil {
		device.Type = *req.Type
	}
	if req.Brand != nil {
		device.Brand = *req.Brand
	}
	if req.Model != nil {
		device.Model = *req.Model
	}
	if req.Icon != nil {
		device.Icon = *req.Icon
	}
	if req.Location != nil {
		device.Location = *req.Location
	}
	if req.Description != nil {
		device.Description = *req.Description
	}
	if req.IsActive != nil {
		device.IsActive = *req.IsActive
	}

	if err := s.db.Save(&device).Error; err != nil {
		return nil, err
	}

	return &device, nil
}

// DeleteDevice deletes a device
func (s *DeviceService) DeleteDevice(id uint, userID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Device{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("device not found")
	}
	return result.Error
}

// PingDevice checks if a device is online and updates status
func (s *DeviceService) PingDevice(id uint, userID uint) (bool, error) {
	var device models.Device
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		return false, fmt.Errorf("device not found")
	}

	isOnline := s.pingDeviceFast(device.IP)

	// Update status in database
	if isOnline {
		now := time.Now()
		s.db.Model(&device).Updates(map[string]interface{}{
			"is_online": true,
			"last_seen": now,
		})
	} else {
		s.db.Model(&device).Update("is_online", false)
	}

	return isOnline, nil
}

// pingDeviceFast performs a quick TCP ping with common ports including CCTV
func (s *DeviceService) pingDeviceFast(ip string) bool {
	// Common ports to check:
	// - 80, 443, 8080: HTTP/HTTPS
	// - 22: SSH
	// - 3389: RDP
	// - 554: RTSP (for cameras/CCTV)
	// - 8000, 8443: Common camera web interfaces
	// - 37777: Dahua cameras
	// - 34567: Chinese CCTV
	// - 9000: Many services
	// - 5000: Synology, many others
	ports := []string{
		"80", "443", "8080", "22", "3389", // Common
		"554", "8000", "8443", "37777", "34567", // CCTV/Camera
		"9000", "5000", "21", "23", // Other services
	}

	// Create a channel to receive results
	result := make(chan bool, len(ports))

	for _, port := range ports {
		go func(p string) {
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(ip, p), 300*time.Millisecond)
			if err == nil {
				conn.Close()
				result <- true
			} else {
				result <- false
			}
		}(port)
	}

	// Wait for any success or all failures
	for i := 0; i < len(ports); i++ {
		if <-result {
			return true // Device is online if any port responds
		}
	}

	return false
}

// getDefaultIcon returns the default icon for a device type
func getDefaultIcon(deviceType string) string {
	switch deviceType {
	case "pc":
		return "monitor"
	case "laptop":
		return "laptop"
	case "server":
		return "server"
	case "phone":
		return "smartphone"
	case "tablet":
		return "tablet"
	case "cctv":
		return "camera"
	case "router":
		return "router"
	default:
		return "device"
	}
}
