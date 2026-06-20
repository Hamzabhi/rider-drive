# Low-memory dev runner for Windows (avoids "paging file too small" during go run).
# Usage: .\scripts\dev.ps1
# Requires Redis — start with: docker compose up redis (from indrive-clone-backend)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$env:GOMAXPROCS = "1"
if (-not $env:REDIS_URL) { $env:REDIS_URL = "redis://localhost:6379" }
if (-not $env:LISTEN_ADDR) { $env:LISTEN_ADDR = ":8081" }
if (-not $env:GRPC_ADDR) { $env:GRPC_ADDR = ":50052" }

New-Item -ItemType Directory -Force -Path bin | Out-Null
Write-Host "Building realtime-server (single-threaded compile)..."
go build -p 1 -o bin/realtime-server.exe ./cmd/server
Write-Host "Starting server on $env:LISTEN_ADDR (gRPC $env:GRPC_ADDR)..."
& .\bin\realtime-server.exe
