package services

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/homelab/backend/database"
	"github.com/homelab/backend/models"
	"gorm.io/gorm"
)

// ServiceConfigService handles service operations
type ServiceConfigService struct {
	db         *gorm.DB
	httpClient *http.Client
}

// NewServiceConfigService creates a new ServiceConfigService
func NewServiceConfigService() *ServiceConfigService {
	return &ServiceConfigService{
		db: database.GetDB(),
		httpClient: &http.Client{
			Timeout: 2 * time.Second, // Fast timeout for quick checks
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 10,
				IdleConnTimeout:     30 * time.Second,
				DisableKeepAlives:   false,
			},
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse // Don't follow redirects
			},
		},
	}
}

// ServiceStatus represents the status of a service
type ServiceStatus struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	URL          string    `json:"url"`
	Icon         string    `json:"icon"`
	Category     string    `json:"category"`
	Description  string    `json:"description"`
	Status       string    `json:"status"` // online, offline, error
	StatusCode   int       `json:"statusCode"`
	ResponseTime int64     `json:"responseTime"` // in milliseconds
	LastCheck    time.Time `json:"lastCheck"`
	IsActive     bool      `json:"isActive"`
}

// GetServices returns all services for a user with their current status
func (s *ServiceConfigService) GetServices(userID uint) ([]ServiceStatus, error) {
	var services []models.ServiceConfig
	if err := s.db.Where("user_id = ?", userID).Order("category ASC, name ASC").Find(&services).Error; err != nil {
		return nil, err
	}

	result := make([]ServiceStatus, len(services))
	var wg sync.WaitGroup

	for i, svc := range services {
		wg.Add(1)
		go func(idx int, service models.ServiceConfig) {
			defer wg.Done()
			status := s.checkService(service)
			result[idx] = status
		}(i, svc)
	}

	wg.Wait()
	return result, nil
}

// GetServicesBasic returns all services without checking status (fast)
func (s *ServiceConfigService) GetServicesBasic(userID uint) ([]ServiceStatus, error) {
	var services []models.ServiceConfig
	if err := s.db.Where("user_id = ?", userID).Order("category ASC, name ASC").Find(&services).Error; err != nil {
		return nil, err
	}

	result := make([]ServiceStatus, len(services))
	for i, svc := range services {
		result[i] = ServiceStatus{
			ID:          svc.ID,
			Name:        svc.Name,
			URL:         svc.URL,
			Icon:        svc.Icon,
			Category:    svc.Category,
			Description: svc.Description,
			Status:      "unknown",
			IsActive:    svc.IsActive,
		}
	}

	return result, nil
}

// checkService checks the status of a single service
func (s *ServiceConfigService) checkService(svc models.ServiceConfig) ServiceStatus {
	status := ServiceStatus{
		ID:          svc.ID,
		Name:        svc.Name,
		URL:         svc.URL,
		Icon:        svc.Icon,
		Category:    svc.Category,
		Description: svc.Description,
		Status:      "offline",
		LastCheck:   time.Now(),
		IsActive:    svc.IsActive,
	}

	if !svc.IsActive {
		status.Status = "disabled"
		return status
	}

	start := time.Now()

	switch svc.Method {
	case "TCP":
		// TCP port check with fast timeout
		host := svc.URL
		if svc.Port > 0 {
			host = fmt.Sprintf("%s:%d", svc.URL, svc.Port)
		}
		conn, err := net.DialTimeout("tcp", host, 1*time.Second)
		if err == nil {
			conn.Close()
			status.Status = "online"
		}
	case "PING":
		// Simple TCP ping to common ports
		host := svc.URL
		ports := []string{"80", "443", "22"}
		for _, port := range ports {
			conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), 500*time.Millisecond)
			if err == nil {
				conn.Close()
				status.Status = "online"
				break
			}
		}
	default:
		// HTTP/HTTPS check with fast timeout
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, "HEAD", svc.URL, nil)
		if err != nil {
			// Fallback to GET if HEAD fails
			req, err = http.NewRequestWithContext(ctx, "GET", svc.URL, nil)
			if err != nil {
				status.Status = "error"
				return status
			}
		}

		// Set user agent to avoid bot detection
		req.Header.Set("User-Agent", "Homelab-Monitor/1.0")

		resp, err := s.httpClient.Do(req)
		if err != nil {
			status.Status = "offline"
		} else {
			defer resp.Body.Close()
			status.StatusCode = resp.StatusCode
			if resp.StatusCode >= 200 && resp.StatusCode < 400 {
				status.Status = "online"
			} else if resp.StatusCode >= 400 && resp.StatusCode < 500 {
				status.Status = "error"
			} else {
				status.Status = "offline"
			}
		}
	}

	status.ResponseTime = time.Since(start).Milliseconds()
	return status
}

// GetService returns a single service by ID
func (s *ServiceConfigService) GetService(id uint, userID uint) (*ServiceStatus, error) {
	var svc models.ServiceConfig
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&svc).Error; err != nil {
		return nil, fmt.Errorf("service not found")
	}

	status := s.checkService(svc)
	return &status, nil
}

// CreateService creates a new service
func (s *ServiceConfigService) CreateService(userID uint, req models.ServiceConfig) (*models.ServiceConfig, error) {
	req.UserID = userID
	if req.Method == "" {
		req.Method = "GET"
	}
	if req.CheckInterval == 0 {
		req.CheckInterval = 60
	}
	if req.Timeout == 0 {
		req.Timeout = 10
	}
	if req.ExpectedCode == 0 {
		req.ExpectedCode = 200
	}
	req.IsActive = true

	if err := s.db.Create(&req).Error; err != nil {
		return nil, err
	}

	return &req, nil
}

// UpdateService updates a service
func (s *ServiceConfigService) UpdateService(id uint, userID uint, updates map[string]interface{}) (*models.ServiceConfig, error) {
	var svc models.ServiceConfig
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&svc).Error; err != nil {
		return nil, fmt.Errorf("service not found")
	}

	if err := s.db.Model(&svc).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &svc, nil
}

// DeleteService deletes a service
func (s *ServiceConfigService) DeleteService(id uint, userID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.ServiceConfig{})
	if result.RowsAffected == 0 {
		return fmt.Errorf("service not found")
	}
	return result.Error
}

// CheckServiceHealth checks the health of a single service
func (s *ServiceConfigService) CheckServiceHealth(id uint, userID uint) (*ServiceStatus, error) {
	var svc models.ServiceConfig
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&svc).Error; err != nil {
		return nil, fmt.Errorf("service not found")
	}

	status := s.checkService(svc)
	return &status, nil
}
