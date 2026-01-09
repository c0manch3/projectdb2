#!/bin/bash

# ProjectDB - Development Environment Setup Script
# This script sets up the full development environment for the ProjectDB application

set -e

echo "=============================================="
echo "  ProjectDB - Development Environment Setup  "
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js 20+${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Error: Node.js version 20+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v) - OK${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}npm $(npm -v) - OK${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Warning: PostgreSQL client (psql) not found in PATH${NC}"
    echo -e "${YELLOW}Make sure PostgreSQL 15+ is installed and running${NC}"
else
    echo -e "${GREEN}PostgreSQL client found - OK${NC}"
fi

echo ""

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Backend setup
echo -e "${YELLOW}Setting up backend...${NC}"
BACKEND_DIR="$PROJECT_ROOT/backend"

if [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"

    # Install dependencies
    echo "Installing backend dependencies..."
    npm install

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Creating .env file from template..."
        cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectdb?schema=public"

# JWT Secrets (change in production!)
JWT_ACCESS_SECRET="your-super-secret-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# JWT Expiration
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Server
PORT=3000
NODE_ENV=development

# File uploads
UPLOAD_MAX_SIZE=52428800
UPLOAD_DEST=./uploads
EOF
        echo -e "${GREEN}.env file created. Please update with your database credentials.${NC}"
    fi

    # Create uploads directory
    mkdir -p uploads

    # Run Prisma migrations
    echo "Running Prisma migrations..."
    npx prisma generate
    npx prisma migrate dev --name init 2>/dev/null || npx prisma db push

    # Seed database (if seed script exists)
    if [ -f "prisma/seed.ts" ]; then
        echo "Seeding database..."
        npx prisma db seed 2>/dev/null || true
    fi

    echo -e "${GREEN}Backend setup complete!${NC}"
else
    echo -e "${YELLOW}Backend directory not found. Will be created during project setup.${NC}"
fi

echo ""

# Frontend setup
echo -e "${YELLOW}Setting up frontend...${NC}"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

if [ -d "$FRONTEND_DIR" ]; then
    cd "$FRONTEND_DIR"

    # Install dependencies
    echo "Installing frontend dependencies..."
    npm install

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "Creating .env file..."
        cat > .env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
EOF
        echo -e "${GREEN}Frontend .env file created.${NC}"
    fi

    echo -e "${GREEN}Frontend setup complete!${NC}"
else
    echo -e "${YELLOW}Frontend directory not found. Will be created during project setup.${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}Setup complete!${NC}"
echo "=============================================="
echo ""
echo "To start the development servers:"
echo ""
echo "  Backend (NestJS):"
echo "    cd backend && npm run start:dev"
echo "    API available at: http://localhost:3000"
echo ""
echo "  Frontend (React/Vite):"
echo "    cd frontend && npm run dev"
echo "    App available at: http://localhost:5173"
echo ""
echo "Database:"
echo "  Ensure PostgreSQL is running with database 'projectdb'"
echo "  Update backend/.env with your database credentials"
echo ""
echo "Default admin credentials (after seeding):"
echo "  Email: admin@projectdb.com"
echo "  Password: Admin123!"
echo ""
