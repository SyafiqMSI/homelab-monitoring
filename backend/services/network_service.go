package services

import (
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"regexp"
	"runtime"
	"strconv"
	"time"
)

type NetworkService struct{}

func NewNetworkService() *NetworkService {
	return &NetworkService{}
}

// Ping google DNS 8.8.8.8
func (s *NetworkService) Ping() (float64, error) {
	host := "8.8.8.8"
	var cmd *exec.Cmd

	// Windows: ping -n 1 -w 1000 8.8.8.8
	// Linux: ping -c 1 -W 1 8.8.8.8
	if runtime.GOOS == "windows" {
		cmd = exec.Command("ping", "-n", "1", "-w", "1000", host)
	} else {
		cmd = exec.Command("ping", "-c", "1", "-W", "1", host)
	}

	out, err := cmd.CombinedOutput()
	if err != nil {
		return 0, err
	}
	output := string(out)

	// Regex to extract time. Supports:
	// Windows: "time=32ms"
	// Linux: "time=32.1 ms"
	re := regexp.MustCompile(`[Tt]ime[=<]([\d\.]+) ?ms`)
	matches := re.FindStringSubmatch(output)
	if len(matches) > 1 {
		val, err := strconv.ParseFloat(matches[1], 64)
		if err != nil {
			return 0, err
		}
		return val, nil
	}
	return 0, fmt.Errorf("could not parse ping output")
}

// Simple Download Speed Test (Download ~10MB)
func (s *NetworkService) TestDownloadSpeed() (float64, error) {
	// 50MB test file from Cloudflare
	// Using a reliable CDN link.
	url := "https://speed.cloudflare.com/__down?bytes=50000000" // 50MB

	start := time.Now()

	client := &http.Client{
		Timeout: 60 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	written, err := io.Copy(io.Discard, resp.Body)
	if err != nil {
		return 0, err
	}

	duration := time.Since(start).Seconds()
	if duration == 0 {
		duration = 0.001 // prevent divide by zero
	}

	// Bits = bytes * 8
	// Mbps = Bits / 1,000,000 / Seconds
	mbps := (float64(written) * 8) / 1000000 / duration
	return mbps, nil
}
