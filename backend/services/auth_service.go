package services

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/homelab/backend/config"
	"github.com/homelab/backend/database"
	"github.com/homelab/backend/models"
	"gorm.io/gorm"
)

// AuthService handles authentication operations
type AuthService struct {
	db        *gorm.DB
	jwtSecret []byte
	jwtExpiry time.Duration
}

// JWTClaims represents the JWT token claims
type JWTClaims struct {
	UserID   uint   `json:"userId"`
	Email    string `json:"email"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

// NewAuthService creates a new AuthService
func NewAuthService() *AuthService {
	cfg := config.AppConfig
	return &AuthService{
		db:        database.GetDB(),
		jwtSecret: []byte(cfg.JWTSecret),
		jwtExpiry: time.Duration(cfg.JWTExpiryHours) * time.Hour,
	}
}

// Login authenticates a user and returns tokens
func (s *AuthService) Login(req models.LoginRequest, userAgent, ipAddress string) (*models.AuthResponse, error) {
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return nil, errors.New("invalid email or password")
	}

	if !user.IsActive {
		return nil, errors.New("account is disabled")
	}

	if !user.CheckPassword(req.Password) {
		return nil, errors.New("invalid email or password")
	}

	// Update last login
	now := time.Now()
	s.db.Model(&user).Update("last_login", now)

	// Generate tokens
	authResponse, err := s.generateAuthResponse(&user)
	if err != nil {
		return nil, err
	}

	// Create session
	session := models.Session{
		UserID:    user.ID,
		Token:     authResponse.AccessToken,
		UserAgent: userAgent,
		IPAddress: ipAddress,
		ExpiresAt: authResponse.ExpiresAt,
	}
	s.db.Create(&session)

	return authResponse, nil
}

// Logout invalidates a user session
func (s *AuthService) Logout(token string) error {
	return s.db.Where("token = ?", token).Delete(&models.Session{}).Error
}

// ValidateToken validates a JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		// Check if session exists and is not expired
		var session models.Session
		if err := s.db.Where("token = ? AND expires_at > ?", tokenString, time.Now()).First(&session).Error; err != nil {
			return nil, errors.New("session expired or invalid")
		}
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// GetUserByID retrieves a user by ID
func (s *AuthService) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateProfile updates user profile information
func (s *AuthService) UpdateProfile(userID uint, req models.UpdateProfileRequest) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Avatar != nil {
		user.Avatar = *req.Avatar
	}

	if err := s.db.Save(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// ChangePassword changes the user's password
func (s *AuthService) ChangePassword(userID uint, req models.ChangePasswordRequest) error {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return err
	}

	if !user.CheckPassword(req.CurrentPassword) {
		return errors.New("current password is incorrect")
	}

	user.Password = req.NewPassword
	if err := user.HashPassword(); err != nil {
		return err
	}

	// Invalidate all sessions except current
	s.db.Where("user_id = ?", userID).Delete(&models.Session{})

	return s.db.Save(&user).Error
}

// generateAuthResponse creates tokens and auth response
func (s *AuthService) generateAuthResponse(user *models.User) (*models.AuthResponse, error) {
	expiresAt := time.Now().Add(s.jwtExpiry)

	claims := JWTClaims{
		UserID:   user.ID,
		Email:    user.Email,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.Email,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		User:        user.ToResponse(),
		AccessToken: tokenString,
		ExpiresAt:   expiresAt,
	}, nil
}
