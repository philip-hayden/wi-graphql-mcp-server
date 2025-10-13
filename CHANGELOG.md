# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-01-12

### Added
- **Complete Upload System**: 4 new tools for camera trap image uploads
  - `createUpload` - Create upload sessions
  - `getUploadUrl` - Get signed upload URLs
  - `completeUpload` - Finalize upload sessions
  - `uploadImageWorkflow` - Complete streamlined upload workflow
- **Texas-Specific Helper Functions**: Species classification and management recommendations
- **Comprehensive Memory Bank**: 6 core documentation files for project continuity
- **NPM Package Configuration**: Professional package.json with proper metadata

### Fixed
- **TypeScript Errors**: All Zod schema compatibility issues resolved
- **GraphQL Query Structure**: Proper pagination and variable types
- **Error Handling**: User-friendly error messages throughout

### Changed
- **Tool Parameters**: Updated to use generic args object for MCP compatibility
- **Package Name**: Changed to `wildlife-insights-mcp` for NPM publishing
- **Documentation**: Comprehensive README with usage examples

## [0.2.0] - 2025-01-11

### Added
- **Identification Workflow**: Complete system for processing camera trap images
  - `getIdentifyPhotosCount` - Count pending identifications
  - `getImagesForIdentification` - Retrieve images for processing
  - `submitIdentification` - Submit species identification
  - `bulkIdentifyImages` - Process multiple images
  - `getIdentificationWorkflow` - Monitor progress
- **Analytics Engine**: Texas-specific wildlife management insights
  - `getProjectAnalytics` - Comprehensive project metrics
  - `getSpeciesAnalytics` - Species pattern analysis
  - `getRanchManagementInsights` - Texas ranch recommendations
  - `getDeploymentAnalytics` - Camera deployment optimization
- **Natural Language Navigation**: 15+ intuitive tools
  - `getMyOrganizations` - Auto-discover user organizations
  - `getMyProjects` - Navigate project hierarchy
  - `exploreMyData` - Step-by-step data exploration

### Fixed
- **Schema Compatibility**: All GraphQL queries match Wildlife Insights API
- **Authentication**: Proper bearer token handling
- **Error Recovery**: Comprehensive error handling with actionable guidance

## [0.1.0] - 2025-01-10

### Added
- **MCP Server Foundation**: Basic server with tool registration
- **GraphQL Integration**: Wildlife Insights API client
- **Authentication System**: Bearer token management
- **Basic Tools**: `whoami`, `auth.setToken`, `executeGraphQL`
- **Development Setup**: TypeScript configuration and build process

## [Unreleased]

### Planned Features
- **AI-Powered Identification**: Automated species suggestions
- **Multi-Project Management**: Cross-project analytics and comparison
- **Advanced Reporting**: Automated report generation and export
- **Mobile Integration**: Synchronization with mobile wildlife apps
- **Predictive Analytics**: Population trend forecasting

### Technical Enhancements
- **Performance Optimization**: Response caching and batch processing
- **Testing Suite**: Comprehensive unit and integration tests
- **Monitoring**: Usage analytics and error tracking
- **Plugin Architecture**: Modular tool system for extensibility

---

## Contributing to Changes

When adding new features or fixes:

1. **Update Memory Bank**: Document changes in appropriate files
2. **Add Tests**: Include test coverage for new functionality
3. **Update Documentation**: Keep README and examples current
4. **Version Bump**: Follow semantic versioning guidelines

### Memory Bank Files to Update:
- `memory-bank/activeContext.md` - Current work focus
- `memory-bank/progress.md` - Status and roadmap
- `memory-bank/systemPatterns.md` - Architecture changes
- `memory-bank/techContext.md` - Technical updates

### Version Guidelines:
- **PATCH** (0.2.1): Bug fixes, no breaking changes
- **MINOR** (0.3.0): New features, backward compatible
- **MAJOR** (1.0.0): Breaking changes or major milestones
