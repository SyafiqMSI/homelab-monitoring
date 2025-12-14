package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/backend/middleware"
	"github.com/homelab/backend/models"
	"github.com/homelab/backend/services"
)

// DeviceHandler handles device-related HTTP requests
type DeviceHandler struct {
	deviceService *services.DeviceService
}

// NewDeviceHandler creates a new DeviceHandler
func NewDeviceHandler(deviceService *services.DeviceService) *DeviceHandler {
	return &DeviceHandler{
		deviceService: deviceService,
	}
}

// GetDevices returns all devices for the current user
// Use ?refresh=true to ping all devices and get live status (slower)
func (h *DeviceHandler) GetDevices(c *gin.Context) {
	userID := middleware.GetUserID(c)
	refresh := c.Query("refresh") == "true"

	var devices []models.Device
	var err error

	if refresh {
		// Ping all devices in parallel (slower but live status)
		devices, err = h.deviceService.GetDevicesWithPing(userID)
	} else {
		// Fast - just return from database with last known status
		devices, err = h.deviceService.GetDevices(userID)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, devices)
}

// GetDevice returns a single device
func (h *DeviceHandler) GetDevice(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	device, err := h.deviceService.GetDevice(uint(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, device)
}

// CreateDevice creates a new device
func (h *DeviceHandler) CreateDevice(c *gin.Context) {
	userID := middleware.GetUserID(c)

	var req models.CreateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.deviceService.CreateDevice(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, device)
}

// UpdateDevice updates a device
func (h *DeviceHandler) UpdateDevice(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	var req models.UpdateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	device, err := h.deviceService.UpdateDevice(uint(id), userID, req)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, device)
}

// DeleteDevice deletes a device
func (h *DeviceHandler) DeleteDevice(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	if err := h.deviceService.DeleteDevice(uint(id), userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "device deleted"})
}

// PingDevice checks if a device is online
func (h *DeviceHandler) PingDevice(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	isOnline, err := h.deviceService.PingDevice(uint(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"online": isOnline})
}

// WakeDevice sends a Wake-on-LAN packet to the device
func (h *DeviceHandler) WakeDevice(c *gin.Context) {
	userID := middleware.GetUserID(c)
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid device ID"})
		return
	}

	if err := h.deviceService.WakeDevice(uint(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Wake-on-LAN packet sent"})
}

// GetDeviceTypes returns available device types
func (h *DeviceHandler) GetDeviceTypes(c *gin.Context) {
	types := []map[string]string{
		{"value": "pc", "label": "PC / Desktop", "icon": "monitor"},
		{"value": "laptop", "label": "Laptop", "icon": "laptop"},
		{"value": "server", "label": "Server", "icon": "server"},
		{"value": "phone", "label": "Phone", "icon": "smartphone"},
		{"value": "tablet", "label": "Tablet", "icon": "tablet"},
		{"value": "cctv", "label": "CCTV / Camera", "icon": "camera"},
		{"value": "router", "label": "Router / Network", "icon": "router"},
		{"value": "other", "label": "Other", "icon": "device"},
	}
	c.JSON(http.StatusOK, types)
}
