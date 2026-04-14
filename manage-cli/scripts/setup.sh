#!/bin/bash

# Setup script for CLI management migration
# This script helps configure Supabase and prepare for migration

set -e

echo "🚀 Setting up CLI Management Migration"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "\n${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "\n${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "\n${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "registry.json" ]; then
    print_error "Please run this script from the manage-cli directory"
    exit 1
fi

print_step "Checking prerequisites..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ required. Current version: $(node --version)"
    exit 1
fi
print_step "Node.js version: $(node --version)"

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    print_step "Installing npm packages..."
    npm install
else
    print_step "Dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_step "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your Supabase credentials"
    echo "Required variables:"
    echo "  - SUPABASE_URL"
    echo "  - SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY (optional, for admin operations)"
else
    print_step ".env file already exists"
fi

# Check if Supabase credentials are configured
if [ -f ".env" ]; then
    source .env
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        print_warning "Supabase credentials not configured in .env"
        echo "Please add your Supabase project credentials to .env file"
    else
        print_step "Supabase credentials found in .env"
    fi
fi

# Create backup of registry.json
if [ -f "registry.json" ] && [ ! -f "registry.json.backup" ]; then
    print_step "Creating backup of registry.json..."
    cp registry.json "registry.json.backup.$(date +%Y%m%d_%H%M%S)"
    cp registry.json registry.json.backup
    print_step "Backup created: registry.json.backup"
fi

# Make scripts executable
print_step "Making scripts executable..."
chmod +x scripts/*.mjs scripts/*.sh

# Test database connection if credentials are available
if [ ! -z "$SUPABASE_URL" ] && [ ! -z "$SUPABASE_ANON_KEY" ]; then
    print_step "Testing database connection..."
    if node -e "
        import { DatabaseCLIManager } from './src/lib/database-manager.mjs';
        const db = new DatabaseCLIManager();
        db.testConnection().then(result => {
            if (result.success) {
                console.log('✅ Database connection successful');
                process.exit(0);
            } else {
                console.log('❌ Database connection failed:', result.message);
                process.exit(1);
            }
        }).catch(err => {
            console.log('❌ Database connection error:', err.message);
            process.exit(1);
        });
    " 2>/dev/null; then
        print_step "Database connection successful"
    else
        print_warning "Database connection failed - check your .env configuration"
    fi
else
    print_warning "Skipping database test - credentials not configured"
fi

print_step "Setup completed!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Configure Supabase (if not done):"
echo "   - Edit .env file with your Supabase project credentials"
echo "   - Deploy schema: supabase db push (or run SQL in Supabase dashboard)"
echo ""
echo "2. Run migration:"
echo "   npm run migrate"
echo ""
echo "3. Test database commands:"
echo "   ./bin/manage.mjs list-db"
echo "   ./bin/manage.mjs add-db test-cli /path/to/launcher"
echo ""
echo "4. If something goes wrong:"
echo "   npm run rollback"
echo ""
echo "📁 Files created/modified:"
echo "  ✅ .env (from .env.example)"
echo "  ✅ registry.json.backup (current registry backup)"
echo "  ✅ scripts/ (made executable)"
echo ""