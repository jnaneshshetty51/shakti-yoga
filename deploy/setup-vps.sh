#!/bin/bash

# Shakti Yoga VPS Setup Script
# Run this script on your Hostinger VPS as root or with sudo

set -e

echo "🚀 Starting Shakti Yoga VPS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Update system
echo -e "${GREEN}📦 Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install required packages
echo -e "${GREEN}📦 Installing required packages...${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    docker.io \
    nodejs \
    npm

# Install Docker Compose V2 plugin
echo -e "${GREEN}📦 Installing Docker Compose plugin...${NC}"
apt-get install -y docker-compose-plugin || {
    echo -e "${YELLOW}⚠️  docker-compose-plugin not available, installing standalone docker-compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
}

# Install Node.js 20.x if not already installed
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    echo -e "${GREEN}📦 Installing Node.js 20.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally
echo -e "${GREEN}📦 Installing PM2...${NC}"
npm install -g pm2

# Start and enable Docker
echo -e "${GREEN}🐳 Setting up Docker...${NC}"
systemctl start docker
systemctl enable docker

# Create application directory
APP_DIR="/var/www/shakti-yoga"
echo -e "${GREEN}📁 Creating application directory at ${APP_DIR}...${NC}"
mkdir -p /var/www
mkdir -p $APP_DIR
mkdir -p /var/log/shakti-yoga

# Create .env file if it doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Please create it manually.${NC}"
    echo -e "${YELLOW}   Copy .env.example to .env and update with your values.${NC}"
fi

# Set up firewall
echo -e "${GREEN}🔥 Configuring firewall...${NC}"
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw allow 9000/tcp # MinIO API
ufw allow 9001/tcp # MinIO Console
ufw --force enable

echo -e "${GREEN}✅ VPS setup complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Clone your repository to $APP_DIR"
echo "2. Copy .env.example to .env and configure it"
echo "3. Run: cd $APP_DIR && ./deploy/deploy.sh"

