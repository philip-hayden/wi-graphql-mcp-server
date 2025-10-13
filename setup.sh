#!/bin/bash

# Wildlife Insights MCP Server - Quick Setup Script
# This script helps users get started quickly with the Wildlife Insights MCP server

echo "🦌 Wildlife Insights MCP Server - Quick Setup"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+."
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

echo "✅ Build successful!"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your Wildlife Insights credentials."
    echo "   Required: WI_BEARER_TOKEN"
    echo "   Optional: WI_GRAPHQL_ENDPOINT (defaults to https://api.wildlifeinsights.org/graphql)"
fi

echo ""
echo "🎉 Setup complete! Your Wildlife Insights MCP server is ready."
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Wildlife Insights bearer token"
echo "2. Start the server: npm run dev"
echo "3. Configure your MCP client (Cline/Cursor) to use the server"
echo "4. Start using natural language tools like 'getMyOrganizations'"
echo ""
echo "📖 See README.md for detailed usage instructions"
echo "📚 Check memory-bank/ for comprehensive documentation"
