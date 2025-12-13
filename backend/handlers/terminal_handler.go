package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/homelab/backend/middleware"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

// TerminalMessage represents a message between client and server
type TerminalMessage struct {
	Type string `json:"type"` // "input", "output", "error"
	Data string `json:"data"`
}

// TerminalHandler handles terminal WebSocket connections
type TerminalHandler struct {
	mu sync.Mutex
}

// NewTerminalHandler creates a new TerminalHandler
func NewTerminalHandler() *TerminalHandler {
	return &TerminalHandler{}
}

// HandleTerminalWS handles WebSocket terminal connections
func (h *TerminalHandler) HandleTerminalWS(c *gin.Context) {
	// Authenticate (handled by middleware usually, but verify here)
	userID := middleware.GetUserID(c)
	if userID == 0 {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	sessionID := fmt.Sprintf("term-%d-%d", userID, time.Now().UnixNano())
	log.Printf("Terminal session started: %s", sessionID)

	// Determine shell
	shell := "bash"
	args := []string{}
	if runtime.GOOS == "windows" {
		shell = "powershell"
		// remove "-Command -" to allow interactive mode (prompts)
		args = []string{"-NoLogo", "-NoExit"}
	} else {
		// Verify bash exists, fallback to sh
		if _, err := exec.LookPath("bash"); err != nil {
			shell = "sh"
		}
		args = []string{"-i"} // Force interactive for bash
	}

	// Prepare command with persistent pipes
	cmd := exec.Command(shell, args...)

	// Set working directory to project root or user home
	cwd, err := os.Getwd()
	if err == nil {
		cmd.Dir = cwd
	}

	// Create pipes
	stdin, err := cmd.StdinPipe()
	if err != nil {
		h.sendError(conn, fmt.Sprintf("Failed to create stdin: %v", err))
		return
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		h.sendError(conn, fmt.Sprintf("Failed to create stdout: %v", err))
		return
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		h.sendError(conn, fmt.Sprintf("Failed to create stderr: %v", err))
		return
	}

	// Start shell
	if err := cmd.Start(); err != nil {
		h.sendError(conn, fmt.Sprintf("Failed to start shell: %v", err))
		return
	}

	// Flag to signal command exit
	done := make(chan struct{})

	// Read output goroutine
	go func() {
		defer close(done)

		// Create a multi-reader for stdout and stderr (basic handling)
		// Better to run separate goroutines, but simple for now
		readOutput(conn, stdout, "output")
	}()

	go func() {
		readOutput(conn, stderr, "error")
	}()

	h.sendOutput(conn, fmt.Sprintf("Connected to persistent %s session in %s\r\n\r\n", shell, cmd.Dir))

	// Inject custom prompt is NOT usually needed in interactive mode,
	// but if it is missing, we can try injecting a newline to trigger it.
	// For now, let's rely on standard interactive mode.

	// Handle input from WebSocket
	go func() {
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				return
			}

			var msg TerminalMessage
			if err := json.Unmarshal(message, &msg); err != nil {
				continue
			}

			if (msg.Type == "input" || msg.Type == "command") && msg.Data != "" {
				// Write to shell stdin
				_, err := stdin.Write([]byte(msg.Data))
				if err != nil {
					h.sendError(conn, fmt.Sprintf("\r\nWrite error: %v", err))
					return
				}
			}
		}
	}()

	// Wait for process to exit or input loop to break (connection closed)
	<-done
	cmd.Process.Kill()
	log.Printf("Terminal session ended: %s", sessionID)
}

func readOutput(conn *websocket.Conn, r io.Reader, msgType string) {
	buf := make([]byte, 1024)
	for {
		n, err := r.Read(buf)
		if n > 0 {
			data := string(buf[:n])
			msg := TerminalMessage{Type: msgType, Data: data}
			msgBytes, _ := json.Marshal(msg)
			conn.WriteMessage(websocket.TextMessage, msgBytes)
		}
		if err != nil {
			return
		}
	}
}

func (h *TerminalHandler) sendOutput(conn *websocket.Conn, data string) {
	msg := TerminalMessage{Type: "output", Data: data}
	msgBytes, _ := json.Marshal(msg)
	conn.WriteMessage(websocket.TextMessage, msgBytes)
}

func (h *TerminalHandler) sendError(conn *websocket.Conn, data string) {
	msg := TerminalMessage{Type: "error", Data: data}
	msgBytes, _ := json.Marshal(msg)
	conn.WriteMessage(websocket.TextMessage, msgBytes)
}
