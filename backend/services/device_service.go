package services

import (
	"fmt"
	"net"
	"os/exec"
	"runtime"
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
	sshPort := req.SSHPort
	if sshPort == 0 {
		sshPort = 22
	}
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
		SSHUser:     req.SSHUser,
		SSHPassword: req.SSHPassword,
		SSHPort:     sshPort,
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
	if req.SSHUser != nil {
		device.SSHUser = *req.SSHUser
	}
	if req.SSHPassword != nil {
		device.SSHPassword = *req.SSHPassword
	}
	if req.SSHPort != nil {
		device.SSHPort = *req.SSHPort
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

// WakeDevice sends a Wake-on-LAN magic packet to the device
func (s *DeviceService) WakeDevice(id uint, userID uint) error {
	var device models.Device
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		return fmt.Errorf("device not found")
	}

	if device.MAC == "" {
		return fmt.Errorf("device has no MAC address")
	}

	macAddr, err := net.ParseMAC(device.MAC)
	if err != nil {
		return fmt.Errorf("invalid MAC address: %v", err)
	}

	// Construct magic packet
	// 6 bytes of 0xFF
	packet := []byte{0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}
	// 16 repetitions of MAC address
	for i := 0; i < 16; i++ {
		packet = append(packet, macAddr...)
	}

	// Send to broadcast address on port 9
	// Try multiple ports (7 and 9)
	ports := []string{"7", "9"}
	for _, port := range ports {
		addr, err := net.ResolveUDPAddr("udp", "255.255.255.255:"+port)
		if err != nil {
			continue
		}

		conn, err := net.DialUDP("udp", nil, addr)
		if err != nil {
			continue
		}

		_, err = conn.Write(packet)
		conn.Close()
		if err != nil {
			continue
		}
	}

	return nil
}

// ShutdownDevice sends a shutdown command to the device via SSH or system command
func (s *DeviceService) ShutdownDevice(id uint, userID uint) error {
	var device models.Device
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		return fmt.Errorf("device not found")
	}

	// Check if device is online first
	if !s.pingDeviceFast(device.IP) {
		return fmt.Errorf("device is offline")
	}

	// For Windows PC, try using net rpc shutdown (no SSH required if on same domain)
	// For Linux/Mac, use SSH
	if device.SSHUser != "" && device.SSHPassword != "" {
		return s.shutdownViaSSH(device)
	}

	// Try Windows RPC shutdown as fallback (works for Windows PCs on same network)
	return s.shutdownViaRPC(device)
}

// shutdownViaSSH sends shutdown command via SSH
func (s *DeviceService) shutdownViaSSH(device models.Device) error {
	port := device.SSHPort
	if port == 0 {
		port = 22
	}

	// Use sshpass for password authentication (simpler than Go SSH library)
	// Determine shutdown command based on common OS types
	// Try Linux shutdown first (works for most Linux/Mac)
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// From Windows, use plink (PuTTY) or ssh if available
		// Try native Windows SSH client first
		sshCmd := fmt.Sprintf("echo y | plink -ssh -pw %s %s@%s -P %d \"sudo shutdown -h now\" 2>&1 || ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 %s@%s -p %d \"sudo shutdown -h now\" 2>&1",
			device.SSHPassword, device.SSHUser, device.IP, port,
			device.SSHUser, device.IP, port)
		cmd = exec.Command("cmd", "/C", sshCmd)
	} else {
		// From Linux/Mac, use sshpass
		cmd = exec.Command("sshpass", "-p", device.SSHPassword,
			"ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=10",
			fmt.Sprintf("%s@%s", device.SSHUser, device.IP),
			"-p", fmt.Sprintf("%d", port),
			"sudo shutdown -h now")
	}

	// Run with timeout
	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case err := <-done:
		// SSH might return error because connection drops on shutdown, which is expected
		if err != nil {
			// Check if it's a connection drop (expected on successful shutdown)
			errStr := err.Error()
			if !contains(errStr, "closed") && !contains(errStr, "Connection") && !contains(errStr, "exit status") {
				return fmt.Errorf("SSH shutdown failed: %v", err)
			}
		}
		return nil
	case <-time.After(15 * time.Second):
		return fmt.Errorf("shutdown command timed out")
	}
}

// shutdownViaRPC uses Windows net rpc or shutdown command for remote Windows PCs
func (s *DeviceService) shutdownViaRPC(device models.Device) error {
	if runtime.GOOS != "windows" {
		return fmt.Errorf("RPC shutdown only available from Windows to Windows devices")
	}

	// Try Windows remote shutdown command
	// shutdown /s /m \\<IP> /t 0 /f
	cmd := exec.Command("shutdown", "/s", "/m", fmt.Sprintf("\\\\%s", device.IP), "/t", "0", "/f")

	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case err := <-done:
		if err != nil {
			return fmt.Errorf("RPC shutdown failed: %v (ensure you have admin access to remote PC)", err)
		}
		return nil
	case <-time.After(10 * time.Second):
		return fmt.Errorf("shutdown command timed out")
	}
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// pingDeviceFast performs a quick TCP ping with common ports including CCTV
// Falls back to ICMP ping if all TCP ports fail
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

	// Fallback: Try ICMP ping if all TCP ports failed
	return s.icmpPing(ip)
}

// icmpPing performs an ICMP ping using the system ping command
func (s *DeviceService) icmpPing(ip string) bool {
	// Use ping command with 1 packet and short timeout
	// Linux: ping -c 1 -W 1 <ip>
	// Windows: ping -n 1 -w 1000 <ip>
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "1000", ip)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "1", ip)
	}

	err := cmd.Run()
	return err == nil
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
