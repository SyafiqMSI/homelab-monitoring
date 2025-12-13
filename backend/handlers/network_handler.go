package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/homelab/backend/services"
)

type NetworkHandler struct {
	service *services.NetworkService
}

func NewNetworkHandler(service *services.NetworkService) *NetworkHandler {
	return &NetworkHandler{service: service}
}

func (h *NetworkHandler) GetPing(c *gin.Context) {
	latency, err := h.service.Ping()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"latency": -1, "error": err.Error(), "status": "offline"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"latency": latency, "status": "online"})
}

func (h *NetworkHandler) GetSpeedTest(c *gin.Context) {
	speed, err := h.service.TestDownloadSpeed()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Speedtest failed", "details": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"downloadMbps": speed})
}
