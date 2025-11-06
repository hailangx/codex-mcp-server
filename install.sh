#!/usr/bin/env bash

# Codex MCP Server Installation Script

set -e

echo "🚀 Installing Codex MCP Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data

# Copy configuration examples
if [ ! -f .env ]; then
    echo "📄 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

if [ ! -f mcp-config.json ]; then
    echo "📄 Creating MCP configuration from example..."
    cp mcp-config.example.json mcp-config.json
    echo "⚠️  Please edit mcp-config.json with your paths"
fi

echo "✅ Installation completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your repository path and settings"
echo "2. Edit mcp-config.json with the correct paths for your MCP client"
echo "3. Run the server: npm start"
echo "4. Or run in development mode: npm run dev"
echo ""
echo "For more information, see README.md"