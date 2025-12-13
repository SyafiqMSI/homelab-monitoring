package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/homelab/backend/services"
)

// DockerHandler handles Docker container endpoints
type DockerHandler struct {
	service *services.DockerService
}

// NewDockerHandler creates a new DockerHandler
func NewDockerHandler(service *services.DockerService) *DockerHandler {
	return &DockerHandler{service: service}
}

// GetContainers returns all containers
func (h *DockerHandler) GetContainers(c *gin.Context) {
	containers := h.service.GetContainers()
	c.JSON(http.StatusOK, containers)
}

// GetContainer returns a specific container
func (h *DockerHandler) GetContainer(c *gin.Context) {
	id := c.Param("id")
	container, err := h.service.GetContainer(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Container not found",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, container)
}

// StartContainer starts a container
func (h *DockerHandler) StartContainer(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.StartContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to start container",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Container started successfully",
		"id":      id,
	})
}

// StopContainer stops a container
func (h *DockerHandler) StopContainer(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.StopContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to stop container",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Container stopped successfully",
		"id":      id,
	})
}

// RestartContainer restarts a container
func (h *DockerHandler) RestartContainer(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.RestartContainer(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to restart container",
			"details": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "Container restarted successfully",
		"id":      id,
	})
}
