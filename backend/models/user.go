package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// User represents a user account
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Email     string         `json:"email" gorm:"size:255;uniqueIndex;not null"`
	Username  string         `json:"username" gorm:"size:100;uniqueIndex;not null"`
	Password  string         `json:"-" gorm:"size:255;not null"` // Never expose password in JSON
	Name      string         `json:"name" gorm:"size:255"`
	Avatar    string         `json:"avatar" gorm:"size:500"`
	Role      string         `json:"role" gorm:"size:50;default:user"` // admin, user
	IsActive  bool           `json:"isActive" gorm:"default:true"`
	LastLogin *time.Time     `json:"lastLogin"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// Session represents an active user session
type Session struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	UserID       uint           `json:"userId" gorm:"not null;index"`
	User         User           `json:"user" gorm:"foreignKey:UserID"`
	Token        string         `json:"-" gorm:"size:500;uniqueIndex;not null"`
	RefreshToken string         `json:"-" gorm:"size:500;index"`
	UserAgent    string         `json:"userAgent" gorm:"size:500"`
	IPAddress    string         `json:"ipAddress" gorm:"size:50"`
	ExpiresAt    time.Time      `json:"expiresAt"`
	CreatedAt    time.Time      `json:"createdAt"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// HashPassword hashes the user's password using bcrypt
func (u *User) HashPassword() error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.Password = string(hashedPassword)
	return nil
}

// CheckPassword compares the provided password with the stored hash
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// BeforeCreate is a GORM hook that runs before creating a user
func (u *User) BeforeCreate(tx *gorm.DB) error {
	return u.HashPassword()
}

// UserResponse is the safe response structure for user data
type UserResponse struct {
	ID        uint       `json:"id"`
	Email     string     `json:"email"`
	Username  string     `json:"username"`
	Name      string     `json:"name"`
	Avatar    string     `json:"avatar"`
	Role      string     `json:"role"`
	IsActive  bool       `json:"isActive"`
	LastLogin *time.Time `json:"lastLogin"`
	CreatedAt time.Time  `json:"createdAt"`
}

// ToResponse converts User to UserResponse (without sensitive data)
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		Username:  u.Username,
		Name:      u.Name,
		Avatar:    u.Avatar,
		Role:      u.Role,
		IsActive:  u.IsActive,
		LastLogin: u.LastLogin,
		CreatedAt: u.CreatedAt,
	}
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// RegisterRequest represents the registration request body
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=30"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken,omitempty"`
	ExpiresAt    time.Time    `json:"expiresAt"`
}

// UpdateProfileRequest represents the profile update request
type UpdateProfileRequest struct {
	Name   *string `json:"name"`
	Avatar *string `json:"avatar"`
}

// ChangePasswordRequest represents the password change request
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required,min=6"`
}
