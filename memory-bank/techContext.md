# Wildlife Insights MCP Server - Technical Context

## Technologies Used

### Core Technologies
- **TypeScript 5.6.3**: Primary development language
- **Node.js**: Runtime environment
- **MCP SDK 1.18.0**: Model Context Protocol implementation
- **GraphQL Request 7.1.0**: GraphQL client library

### Development Tools
- **TSX 4.19.2**: TypeScript execution for development
- **Zod 3.19.0**: Runtime type validation
- **Dotenv 16.4.5**: Environment variable management

### API Integration
- **Wildlife Insights GraphQL API**: Target data source
- **REST endpoints**: Authentication and file access
- **Bearer token authentication**: API access control

## Development Setup

### Prerequisites
```bash
# Required
Node.js 18+
npm or yarn
TypeScript knowledge
Wildlife Insights API access

# Optional (for full development)
Git
VS Code or similar IDE
```

### Installation
```bash
# Clone and setup
git clone <repository>
cd wi-graphql-mcp-server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Wildlife Insights credentials
```

### Environment Configuration
```bash
# .env file structure
WI_GRAPHQL_ENDPOINT=https://api.wildlifeinsights.org/graphql
WI_BEARER_TOKEN=your_bearer_token_here
WI_USER_AGENT=wi-mcp/0.2.1
WI_TIMEOUT_MS=60000
```

### Development Workflow
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Technical Constraints

### 1. Wildlife Insights API Limitations
**Constraint**: Analytics data only available for mature projects
**Impact**: New projects show limited analytics until sufficient data exists
**Mitigation**: Provide foundational recommendations based on available metadata

**Constraint**: JSONObject return types for complex data
**Impact**: Species and location data require client-side processing
**Mitigation**: Helper functions transform data into usable formats

**Constraint**: Strict variable type requirements
**Impact**: Project IDs must be strings (ID type), not integers
**Mitigation**: Runtime type conversion and validation

### 2. MCP Protocol Constraints
**Constraint**: Tool schema must match MCP SDK expectations
**Impact**: Zod schemas require type casting for compatibility
**Mitigation**: `as ZodRawShape` casting for all input schemas

**Constraint**: Function handlers must accept generic args object
**Impact**: Cannot use destructured parameters directly
**Mitigation**: Extract parameters from args object within handlers

### 3. GraphQL API Constraints
**Constraint**: Pagination structure varies by endpoint
**Impact**: Some endpoints use `limit`/`offset`, others use `pageSize`/`pageNumber`
**Mitigation**: Endpoint-specific pagination handling

**Constraint**: Authentication required for private data
**Impact**: Public exploration limited, private data needs tokens
**Mitigation**: Dual-mode support (authenticated vs public)

## Dependencies

### Production Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.18.0",
  "dotenv": "^16.4.5",
  "graphql": "^16.9.0",
  "graphql-request": "^7.1.0",
  "zod": "^3.19.0"
}
```

### Development Dependencies
```json
{
  "@types/node": "^22.7.5",
  "tsx": "^4.19.2",
  "typescript": "^5.6.3"
}
```

## Development Environment

### IDE Configuration
- **TypeScript**: Strict mode enabled
- **ESLint**: Standard JavaScript/TypeScript rules
- **Prettier**: Code formatting
- **VS Code Extensions**: TypeScript, GraphQL syntax highlighting

### Debugging Setup
- **Console Logging**: Primary debugging method
- **Error Preservation**: Maintain technical details for troubleshooting
- **Environment Variables**: Easy switching between dev/prod

### Testing Approach
- **Manual Testing**: Direct API testing with curl
- **Integration Testing**: MCP client testing
- **User Acceptance**: Real workflow validation

## Technical Debt & Known Issues

### Current Technical Debt
1. **Single File Architecture**: All tools in one file for simplicity
   - **Impact**: Large file, harder to navigate
   - **Plan**: Split into multiple files when complexity warrants

2. **Inline Helper Functions**: Texas-specific logic mixed with server code
   - **Impact**: Business logic coupled with infrastructure
   - **Plan**: Extract to separate modules when patterns solidify

3. **GraphQL Query Duplication**: Similar queries repeated across tools
   - **Impact**: Maintenance overhead
   - **Plan**: Create query builder or shared query library

### API-Related Issues
1. **Analytics Data Availability**: Limited for new projects
   - **Status**: Expected behavior, documented in user guidance
   - **Mitigation**: Clear messaging about data requirements

2. **Variable Type Strictness**: ID vs Int type mismatches
   - **Status**: Runtime validation implemented
   - **Mitigation**: Type conversion in tool handlers

## Performance Characteristics

### Current Performance Profile
- **Startup Time**: < 2 seconds (TSX hot reload)
- **Memory Usage**: ~50MB for server instance
- **API Response Time**: < 5 seconds for typical queries
- **Concurrent Requests**: Not tested (single-client design)

### Scalability Considerations
- **Current Design**: Single client, suitable for individual use
- **Rate Limiting**: Implicit through API error handling
- **Caching**: None implemented (real-time data preferred)
- **Batch Processing**: Supported for identification workflows

## Security Considerations

### Authentication Management
- **Token Storage**: Environment variables (secure)
- **Runtime Tokens**: Session-based (temporary)
- **No Hardcoded Secrets**: All credentials externalized

### Data Privacy
- **No Data Storage**: Server processes requests, doesn't store data
- **Temporary Processing**: Request/response data ephemeral
- **User Consent**: Clear tool descriptions about data access

### Input Validation
- **Schema Validation**: All inputs validated via Zod
- **Type Safety**: TypeScript prevents injection attacks
- **Error Sanitization**: Sensitive data removed from error messages

## Deployment Considerations

### Development Deployment
- **Platform**: Local development environment
- **Process Management**: Manual start/stop
- **Environment**: Development credentials

### Production Deployment
- **Platform**: Server environment (local or cloud)
- **Process Management**: Process manager (PM2, systemd)
- **Environment**: Production credentials with rotation

### Configuration Management
- **Environment Variables**: All configuration externalized
- **Secret Management**: Integration with key management systems
- **Credential Rotation**: Support for token refresh workflows

## Monitoring & Observability

### Current Monitoring
- **Error Logging**: Console output for debugging
- **API Errors**: Preserved for troubleshooting
- **Performance**: No formal monitoring

### Future Monitoring Needs
- **Usage Analytics**: Tool usage patterns
- **Error Tracking**: API error rates and types
- **Performance Metrics**: Response times and throughput

## Compatibility Matrix

### Supported Platforms
- **Node.js**: 18.x, 20.x, 22.x
- **Operating Systems**: Linux, macOS, Windows (WSL)
- **MCP Clients**: Cline, Cursor, any MCP-compliant client

### API Compatibility
- **Wildlife Insights**: Current API version
- **GraphQL**: Standard GraphQL compliance
- **Authentication**: Bearer token standard

## Maintenance Requirements

### Regular Tasks
1. **API Testing**: Validate against Wildlife Insights API changes
2. **Dependency Updates**: Monitor for security updates
3. **Memory Bank Updates**: Keep documentation current

### Update Procedures
1. **Schema Changes**: Update GraphQL queries and types
2. **New Features**: Add tools following established patterns
3. **Bug Fixes**: Test against real API before deployment
4. **Documentation**: Update memory bank for significant changes

## Technical Risk Assessment

### High Risk Areas
- **API Schema Changes**: Could break existing queries
- **Authentication Changes**: Token format or endpoint changes
- **MCP Protocol Updates**: SDK changes could affect compatibility

### Mitigation Strategies
- **Comprehensive Error Handling**: Graceful degradation
- **Input Validation**: Prevent malformed requests
- **Documentation**: Clear update procedures
- **Testing**: Regular validation against live API

## Future Technical Enhancements

### Short Term (Next 1-2 sessions)
- **Response Caching**: Cache frequently accessed data
- **Batch Optimization**: Improve bulk operation efficiency
- **Enhanced Error Messages**: More specific guidance

### Medium Term (Next 1-3 months)
- **Multi-Client Support**: Handle concurrent requests
- **Advanced Analytics**: Machine learning integration
- **Performance Monitoring**: Usage and performance tracking

### Long Term (Next 6-12 months)
- **Plugin Architecture**: Modular tool system
- **Advanced AI Integration**: Automated species identification
- **Multi-Platform Support**: Integration with other wildlife platforms
