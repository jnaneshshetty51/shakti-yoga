# Docker Compose Command Fix

## Issue
The command `docker-compose` is not found on your system.

## Solution

Modern Docker installations use **`docker compose`** (V2, with a space) instead of **`docker-compose`** (V1, with a hyphen).

### Quick Fix - Use the correct command:

```bash
# Instead of:
docker-compose up -d

# Use:
docker compose up -d
```

### All Docker Compose Commands:

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs

# Restart services
docker compose restart

# Check status
docker compose ps
```

## If `docker compose` still doesn't work:

### Option 1: Install Docker Compose Plugin (Recommended)
```bash
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

### Option 2: Install Standalone Docker Compose V1
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

Then use `docker-compose` (with hyphen) instead of `docker compose`.

### Option 3: Check if Docker Compose is already installed
```bash
# Check Docker Compose V2
docker compose version

# Check Docker Compose V1
docker-compose --version
```

## Verify Installation

After installation, verify:
```bash
docker compose version
# Should show: Docker Compose version v2.x.x
```

## Updated Documentation

All documentation has been updated to use `docker compose` (V2). If your system only has V1, you can:
1. Install V2 plugin (recommended)
2. Or replace `docker compose` with `docker-compose` in commands

