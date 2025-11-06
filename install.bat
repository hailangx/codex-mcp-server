@echo off
REM Codex MCP Server Installation Script for Windows

echo 🚀 Installing Codex MCP Server...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo ✅ Node.js version check passed

REM Install dependencies
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

REM Build the project
echo 🔨 Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Failed to build project
    exit /b 1
)

REM Create data directory
echo 📁 Creating data directory...
if not exist "data" mkdir data

REM Copy configuration examples
if not exist ".env" (
    echo 📄 Creating .env file from example...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your configuration
)

if not exist "mcp-config.json" (
    echo 📄 Creating MCP configuration from example...
    copy mcp-config.example.json mcp-config.json
    echo ⚠️  Please edit mcp-config.json with your paths
)

echo ✅ Installation completed!
echo.
echo Next steps:
echo 1. Edit .env file with your repository path and settings
echo 2. Edit mcp-config.json with the correct paths for your MCP client
echo 3. Run the server: npm start
echo 4. Or run in development mode: npm run dev
echo.
echo For more information, see README.md

pause