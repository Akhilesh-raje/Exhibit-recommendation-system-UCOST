#!/bin/bash

# =============================================================================
# UCOST Discovery Hub - Complete Rebuild Script
# =============================================================================
# This script performs a complete rebuild of all services from scratch
# Usage: ./REBUILD_FROM_SCRATCH.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}UCOST Discovery Hub - Complete Rebuild${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# =============================================================================
# PHASE 1: CLEAN ALL BUILD DIRECTORIES
# =============================================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 1: Cleaning Build Directories${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

clean_dirs=(
    "project/frontend/ucost-discovery-hub/dist"
    "project/backend/backend/dist"
    "project/chatbot-mini/dist"
    "desktop/dist"
)

for dir in "${clean_dirs[@]}"; do
    full_path="$PROJECT_ROOT/$dir"
    if [ -d "$full_path" ]; then
        print_info "Removing: $dir"
        rm -rf "$full_path"
        print_status "Cleaned: $dir"
    else
        print_info "Skipping (not found): $dir"
    fi
done

# =============================================================================
# PHASE 2: INSTALL DEPENDENCIES
# =============================================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 2: Installing Dependencies${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Frontend
echo -e "${YELLOW}Installing Frontend dependencies...${NC}"
cd "$PROJECT_ROOT/project/frontend/ucost-discovery-hub"
if npm install; then
    print_status "Frontend dependencies installed"
else
    print_error "Frontend dependencies installation failed"
    exit 1
fi

# Backend
echo -e "${YELLOW}Installing Backend dependencies...${NC}"
cd "$PROJECT_ROOT/project/backend/backend"
if npm install; then
    print_status "Backend dependencies installed"
else
    print_error "Backend dependencies installation failed"
    exit 1
fi

# Chatbot
echo -e "${YELLOW}Installing Chatbot dependencies...${NC}"
cd "$PROJECT_ROOT/project/chatbot-mini"
if npm install; then
    print_status "Chatbot dependencies installed"
else
    print_error "Chatbot dependencies installation failed"
    exit 1
fi

# Desktop
echo -e "${YELLOW}Installing Desktop app dependencies...${NC}"
cd "$PROJECT_ROOT/desktop"
if npm install; then
    print_status "Desktop app dependencies installed"
else
    print_error "Desktop app dependencies installation failed"
    exit 1
fi

# =============================================================================
# PHASE 3: BUILD SERVICES
# =============================================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 3: Building Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Build Backend
echo -e "${YELLOW}Building Backend...${NC}"
cd "$PROJECT_ROOT/project/backend/backend"
if npm run build; then
    print_status "Backend built successfully"
    
    # Generate Prisma client
    echo -e "${YELLOW}Generating Prisma client...${NC}"
    if npx prisma generate; then
        print_status "Prisma client generated"
    else
        print_warning "Prisma client generation failed (may not be critical)"
    fi
else
    print_error "Backend build failed"
    exit 1
fi

# Build Chatbot
echo -e "${YELLOW}Building Chatbot...${NC}"
cd "$PROJECT_ROOT/project/chatbot-mini"
if npm run build; then
    print_status "Chatbot built successfully"
else
    print_error "Chatbot build failed"
    exit 1
fi

# Build Frontend
echo -e "${YELLOW}Building Frontend...${NC}"
cd "$PROJECT_ROOT/project/frontend/ucost-discovery-hub"
if npm run build; then
    print_status "Frontend built successfully"
    
    # Verify React loading order
    echo -e "${YELLOW}Verifying React loading order...${NC}"
    if grep -q "vendor-react" dist/index.html && grep -q "vendor-misc" dist/index.html; then
        react_line=$(grep -n "vendor-react" dist/index.html | head -1 | cut -d: -f1)
        misc_line=$(grep -n "vendor-misc" dist/index.html | head -1 | cut -d: -f1)
        if [ "$react_line" -lt "$misc_line" ]; then
            print_status "React loads before vendor-misc ✓"
        else
            print_warning "React may load after vendor-misc (check vite-plugin-react-first)"
        fi
    fi
else
    print_error "Frontend build failed"
    exit 1
fi

# =============================================================================
# PHASE 4: VERIFY BUILD OUTPUTS
# =============================================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 4: Verifying Build Outputs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Verify Frontend
if [ -f "$PROJECT_ROOT/project/frontend/ucost-discovery-hub/dist/index.html" ]; then
    print_status "Frontend index.html exists"
else
    print_error "Frontend index.html missing"
    exit 1
fi

# Verify Backend
if [ -f "$PROJECT_ROOT/project/backend/backend/dist/app.js" ]; then
    print_status "Backend app.js exists"
else
    print_error "Backend app.js missing"
    exit 1
fi

# Verify Chatbot
if [ -f "$PROJECT_ROOT/project/chatbot-mini/dist/server.js" ]; then
    print_status "Chatbot server.js exists"
else
    print_error "Chatbot server.js missing"
    exit 1
fi

# =============================================================================
# PHASE 5: DESKTOP APP BUILD
# =============================================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 5: Building Desktop App${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

cd "$PROJECT_ROOT/desktop"

# Pre-deployment checks
echo -e "${YELLOW}Running pre-deployment checks...${NC}"
if npm run pre-deploy; then
    print_status "Pre-deployment checks passed"
else
    print_warning "Pre-deployment checks failed (continuing anyway)"
fi

# Build all services (runs Phase 3 automatically)
echo -e "${YELLOW}Building all services for desktop...${NC}"
if npm run build; then
    print_status "All services built for desktop"
else
    print_error "Desktop build failed"
    exit 1
fi

# =============================================================================
# PHASE 6: FINAL VERIFICATION
# =============================================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}PHASE 6: Final Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Check all critical files
critical_files=(
    "project/frontend/ucost-discovery-hub/dist/index.html"
    "project/backend/backend/dist/app.js"
    "project/chatbot-mini/dist/server.js"
    "desktop/main.js"
    "desktop/src/config.js"
    "desktop/src/service-manager.js"
    "desktop/src/window-manager.js"
)

all_present=true
for file in "${critical_files[@]}"; do
    full_path="$PROJECT_ROOT/${file//\//\/}"
    if [ -f "$full_path" ]; then
        print_status "Found: $file"
    else
        print_error "Missing: $file"
        all_present=false
    fi
done

if [ "$all_present" = true ]; then
    print_status "All critical files present"
else
    print_error "Some critical files are missing"
    exit 1
fi

# =============================================================================
# SUCCESS
# =============================================================================

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ REBUILD COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

print_info "Next steps:"
echo -e "  1. Test development mode: ${YELLOW}cd desktop && npm run dev${NC}"
echo -e "  2. Test production mode: ${YELLOW}cd desktop && npm run dev:prod${NC}"
echo -e "  3. Package for distribution: ${YELLOW}cd desktop && npm run package${NC}\n"

