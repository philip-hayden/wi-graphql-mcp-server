# wi-graphql-mcp-server

[![CI/CD Pipeline](https://github.com/philip-hayden/wi-graphql-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/philip-hayden/wi-graphql-mcp-server/actions/workflows/ci.yml)
[![Auto Version](https://github.com/philip-hayden/wi-graphql-mcp-server/actions/workflows/auto-version.yml/badge.svg)](https://github.com/philip-hayden/wi-graphql-mcp-server/actions/workflows/auto-version.yml)

A Model Context Protocol (MCP) server implementing the Wildlife Insights GraphQL API. This server provides natural language tools for wildlife management and species identification.


🦌 **Natural Language Interface for Wildlife Insights GraphQL API**

A comprehensive Model Context Protocol (MCP) server that provides intuitive, natural language tools for accessing Wildlife Insights data. Perfect for wildlife management, species identification workflows, and Texas ranch operations.

[![npm version](https://badge.fury.io/js/wildlife-insights-mcp.svg)](https://badge.fury.io/js/wildlife-insights-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

### 🎯 **20+ Natural Language Tools**
- **Data Navigation**: `getMyOrganizations`, `exploreMyData`, `getMyProjects`
- **Species Identification**: `getIdentifyPhotosCount`, `submitIdentification`, `bulkIdentifyImages`
- **Analytics & Insights**: `getRanchManagementInsights`, `getSpeciesAnalytics`, `getProjectAnalytics`
- **Upload Management**: `createUpload`, `uploadImageWorkflow`, `completeUpload`
- **Advanced**: `executeGraphQL` for custom queries

### 🦌 **Texas Ranch Optimized**
- Texas game species classification
- Ranch management goal alignment (conservation/hunting/ecotourism)
- Habitat management recommendations
- Seasonal monitoring guidance

### 🔧 **Production Ready**
- TypeScript implementation
- Comprehensive error handling
- Complete memory bank documentation
- Professional deployment options

## 🚀 Quick Start

### Installation
```bash
# Install from NPM (recommended)
npm install -g wildlife-insights-mcp

# Or from source
git clone https://github.com/yourusername/wildlife-insights-mcp.git
cd wildlife-insights-mcp
npm install
```

### Development
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### MCP Client Configuration

#### For Cline/Cursor:
```json
{
  "mcpServers": {
    "wildlife-insights": {
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "node",
      "args": ["./node_modules/tsx/dist/cli.mjs", "src/server.ts"],
      "cwd": "/path/to/wildlife-insights-mcp",
      "env": {
        "WI_GRAPHQL_ENDPOINT": "https://api.wildlifeinsights.org/graphql",
        "WI_BEARER_TOKEN": "your_token_here"
      }
    }
  }
}
```

## 📖 Usage Examples

### 🏠 Organization Discovery
```javascript
// Find your organizations
await use_mcp_tool("wildlife-insights", "getMyOrganizations")
```

### 📊 Project Analytics
```javascript
// Get Texas ranch management insights
await use_mcp_tool("wildlife-insights", "getRanchManagementInsights", {
  projectId: "2010935",
  ranchGoals: "balanced"
})
```

### 🦊 Species Analysis
```javascript
// Analyze species in your project
await use_mcp_tool("wildlife-insights", "getSpeciesAnalytics", {
  projectId: "2010935"
})
```

### 📷 Identification Workflow
```javascript
// Check pending identifications
await use_mcp_tool("wildlife-insights", "getIdentifyPhotosCount", {
  projectId: "2010935"
})

// Get images for identification
await use_mcp_tool("wildlife-insights", "getImagesForIdentification", {
  projectId: "2010935",
  limit: 20
})
```

### 📤 Upload Management
```javascript
// Complete upload workflow
await use_mcp_tool("wildlife-insights", "uploadImageWorkflow", {
  projectId: "2010935",
  deploymentId: "2420851",
  fileName: "camera001.jpg",
  fileSize: "1024000"
})
```

## 🔧 Authentication

### Option 1: Environment Variable
```bash
export WI_BEARER_TOKEN="your_bearer_token_here"
npm run dev
```

### Option 2: Runtime Setup
```javascript
// Set token for this session
await use_mcp_tool("wildlife-insights", "auth.setToken", {
  token: "your_bearer_token_here"
})
```

## 🏗️ Development

### Project Structure
```
├── src/
│   ├── server.ts          # Main MCP server with all tools
│   ├── wiClient.ts        # GraphQL client wrapper
│   └── schemas/
│       └── operations.ts  # GraphQL query definitions
├── memory-bank/           # Complete project documentation
│   ├── projectbrief.md    # Core requirements
│   ├── productContext.md  # Problem/solution fit
│   ├── activeContext.md   # Current work focus
│   ├── systemPatterns.md  # Architecture patterns
│   ├── techContext.md     # Technical implementation
│   └── progress.md        # Status and roadmap
├── dist/                  # Compiled JavaScript (auto-generated)
└── examples/              # MCP client configurations
```

### Adding New Tools
1. Add GraphQL queries to `src/schemas/operations.ts`
2. Register tools in `src/server.ts`
3. Update memory bank documentation
4. Test with real API calls

## 📋 Available Tools

### 🏢 **Organization & Project Management**
- `getMyOrganizations` - Discover accessible organizations
- `getMyProjects` - Navigate project hierarchy
- `exploreMyData` - Step-by-step data exploration
- `getProjectDetails` - Comprehensive project information

### 📊 **Analytics & Insights**
- `getProjectAnalytics` - Overall project metrics
- `getSpeciesAnalytics` - Species pattern analysis
- `getRanchManagementInsights` - Texas-specific recommendations
- `getDeploymentAnalytics` - Camera deployment optimization

### 🦊 **Species Identification**
- `getIdentifyPhotosCount` - Count pending identifications
- `getImagesForIdentification` - Retrieve images for processing
- `submitIdentification` - Submit species identification
- `bulkIdentifyImages` - Process multiple images
- `getIdentificationWorkflow` - Monitor progress

### 📤 **Upload Management**
- `createUpload` - Create upload sessions
- `getUploadUrl` - Get signed upload URLs
- `completeUpload` - Finalize upload sessions
- `uploadImageWorkflow` - Complete upload workflow

### 🔧 **System & Advanced**
- `executeGraphQL` - Run custom GraphQL queries
- `auth.setToken` - Manage authentication
- `auth.refreshToken` - Token management
- `whoami` - Server information

## 🌍 Texas Ranch Focus

This MCP server is specifically optimized for Texas ranch wildlife management:

- **Game Species**: White-tailed deer, feral hogs, collared peccary
- **Management Goals**: Conservation, hunting, ecotourism, balanced approaches
- **Habitat Types**: Texas ecosystems and seasonal patterns
- **Regulatory Context**: Texas wildlife regulations and best practices

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Update memory bank documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Wildlife Insights**: GraphQL API and platform
- **MCP SDK**: Model Context Protocol implementation
- **Texas Ranchers**: Real-world use case and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/wildlife-insights-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/wildlife-insights-mcp/discussions)
- **Documentation**: Complete memory bank in `memory-bank/` directory

---

**Made with ❤️ for wildlife conservation and ranch management**
