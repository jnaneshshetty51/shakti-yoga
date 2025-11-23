#!/bin/bash

# Database Setup Script
# This script creates migrations and seeds the database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🗄️  Setting up database...${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "${YELLOW}Please copy env.template to .env and configure it.${NC}"
    exit 1
fi

# Generate Prisma Client
echo -e "${GREEN}📦 Generating Prisma Client...${NC}"
npx prisma generate

# Check if migrations directory exists
if [ ! -d "prisma/migrations" ]; then
    echo -e "${YELLOW}📝 No migrations found. Creating initial migration...${NC}"
    echo -e "${YELLOW}This will create the database schema.${NC}"
    npx prisma migrate dev --name init
else
    echo -e "${GREEN}🔄 Running migrations...${NC}"
    npx prisma migrate deploy
fi

# Seed database
echo -e "${GREEN}🌱 Seeding database...${NC}"
npm run db:seed

echo -e "${GREEN}✅ Database setup complete!${NC}"

