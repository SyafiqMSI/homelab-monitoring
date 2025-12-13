package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/homelab/backend/services"
)

// MetricsHandler handles system metrics endpoints
type MetricsHandler struct {
	service *services.MetricsService
}

// NewMetricsHandler creates a new MetricsHandler
func NewMetricsHandler(service *services.MetricsService) *MetricsHandler {
	return &MetricsHandler{service: service}
}

// GetSystemMetrics returns all system metrics
func (h *MetricsHandler) GetSystemMetrics(c *gin.Context) {
	metrics, err := h.service.GetSystemMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get system metrics",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

// GetCPUMetrics returns CPU-specific metrics
func (h *MetricsHandler) GetCPUMetrics(c *gin.Context) {
	metrics, err := h.service.GetCPUMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get CPU metrics",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

// GetMemoryMetrics returns memory-specific metrics
func (h *MetricsHandler) GetMemoryMetrics(c *gin.Context) {
	metrics, err := h.service.GetMemoryMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get memory metrics",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

// GetDiskMetrics returns disk-specific metrics
func (h *MetricsHandler) GetDiskMetrics(c *gin.Context) {
	metrics, err := h.service.GetDiskMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get disk metrics",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

// GetNetworkMetrics returns network-specific metrics
func (h *MetricsHandler) GetNetworkMetrics(c *gin.Context) {
	metrics, err := h.service.GetNetworkMetrics()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get network metrics",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, metrics)
}

// GetMetricsHistory returns historical metrics data
func (h *MetricsHandler) GetMetricsHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	history := h.service.GetMetricsHistory(limit)
	c.JSON(http.StatusOK, history)
}
