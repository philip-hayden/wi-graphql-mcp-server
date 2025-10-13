# Wildlife Insights MCP Server - System Patterns

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │◄──►│   MCP Server     │◄──►│  Wildlife API   │
│   (Cline/Cursor)│    │   (Node.js/TS)   │    │  (GraphQL)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Memory Bank    │
                       │   (Markdown)     │
                       └──────────────────┘
```

### Component Relationships

#### 1. MCP Server Core (`src/server.ts`)
- **Responsibility**: Tool registration and request handling
- **Pattern**: Singleton server instance with registered tools
- **Dependencies**: WiClient, Zod schemas, helper functions

#### 2. Wildlife Insights Client (`src/wiClient.ts`)
- **Responsibility**: GraphQL API communication
- **Pattern**: Client wrapper with authentication
- **Dependencies**: GraphQL client, environment variables

#### 3. Memory Bank (`memory-bank/`)
- **Responsibility**: Project context and documentation
- **Pattern**: Hierarchical markdown documentation
- **Dependencies**: None (file-based)

## Key Technical Decisions

### 1. Language & Runtime
**Decision**: TypeScript + Node.js
**Rationale**:
- Type safety for complex GraphQL operations
- Strong MCP SDK support
- Familiar ecosystem for maintenance
**Trade-offs**:
- Compilation step required
- Larger bundle size than JavaScript

### 2. API Communication
**Decision**: Direct GraphQL requests via graphql-request
**Rationale**:
- Lightweight and efficient
- Good TypeScript support
- Familiar for GraphQL operations
**Alternatives Considered**:
- Apollo Client (too heavy for server context)
- Direct fetch with manual GraphQL parsing (too much boilerplate)

### 3. Authentication Strategy
**Decision**: Bearer token management with environment variable fallback
**Rationale**:
- Secure token storage
- Flexible deployment options
- Runtime token updates via tools
**Implementation**:
```typescript
// Environment variable (persistent)
process.env.WI_BEARER_TOKEN

// Runtime updates (session-based)
wi.setToken(userProvidedToken)
```

### 4. Error Handling Architecture
**Decision**: Layered error handling with user-friendly messages
**Rationale**:
- Users shouldn't see raw GraphQL or network errors
- Provide actionable guidance for common issues
- Maintain debugging information for developers
**Pattern**:
```typescript
try {
  // API call
} catch (error) {
  // User-friendly error message
  // Preserve technical details for debugging
}
```

## Design Patterns in Use

### 1. Tool Registration Pattern
**Pattern**: Declarative tool registration with schema validation
```typescript
server.registerTool(
  "toolName",
  {
    description: "Human readable description",
    inputSchema: { /* Zod schema */ } as ZodRawShape,
  },
  async (args: { [key: string]: any }) => {
    // Implementation
  }
)
```

### 2. Response Formatting Pattern
**Pattern**: Consistent dual-format responses
```typescript
return {
  content: [
    { type: "text", text: "Human readable summary" },
    { type: "resource", resource: {
      text: JSON.stringify(data, null, 2),
      uri: "descriptive-filename.json"
    }}
  ]
}
```

### 3. Natural Language Tool Design
**Pattern**: Outcome-focused tool naming
```typescript
// ✅ Good: Describes what user wants
"getMyOrganizations"
"exploreMyData"
"getRanchManagementInsights"

// ❌ Avoid: API endpoint names
"getParticipantData"
"executeGraphQLQuery"
"getAnalyticsByParameter"
```

### 4. Progressive Enhancement Pattern
**Pattern**: Core functionality first, advanced features second
- **Phase 1**: Basic identification workflow ✅
- **Phase 2**: Enhanced analytics and insights ✅
- **Phase 3**: AI-powered assistance (future)

## Critical Implementation Paths

### 1. Authentication Flow
```
Environment Variable → WiClient Initialization → Tool Execution → Token Refresh
     ↓                        ↓                    ↓              ↓
WI_BEARER_TOKEN     →    Bearer token set   →   Per-call token → auth.setToken()
```

### 2. Query Execution Pipeline
```
Tool Handler → Input Validation → GraphQL Client → Response Processing → Formatted Output
     ↓              ↓                   ↓              ↓                   ↓
MCP Args    →   Zod Schema     →   wi.exec()  →   JSON Parse    →   Content Array
```

### 3. Error Recovery Chain
```
API Error → User-Friendly Message → Debugging Info → Suggestions → Retry Options
    ↓             ↓                      ↓              ↓            ↓
GraphQL    →   "Error getting..."  →   Preserve      →   "Try..." →   Tool Options
```

## Component Architecture

### Server Layer (`src/server.ts`)
```typescript
// Tool definitions with schemas
server.registerTool("toolName", {
  description: "Description",
  inputSchema: zodSchema,
}, handlerFunction)
```

### Client Layer (`src/wiClient.ts`)
```typescript
// GraphQL communication
export class WiClient {
  async exec<T>(query: string, variables: any, operationName?: string, token?: string): Promise<T>
}
```

### Helper Layer (Inline Functions)
```typescript
// Texas-specific logic
function getTexasSpeciesStatus(scientificName: string): string
function generateSpeciesRecommendations(species: any[], goals: string): string[]
```

## Data Flow Patterns

### 1. Hierarchy Navigation Flow
```
User Query → getMyOrganizations → getMyProjects → getProjectDetails
     ↓             ↓                    ↓              ↓
"Show orgs" → List orgs         → List projects → Show details
```

### 2. Identification Workflow Flow
```
Check Count → Get Images → Submit ID → Track Progress
     ↓           ↓           ↓           ↓
268 pending → 20 images → ID data → Workflow status
```

### 3. Analytics Generation Flow
```
Raw Data → Process & Analyze → Generate Insights → Format Response
    ↓            ↓                  ↓                 ↓
API JSON → Helper functions → Recommendations → User + JSON
```

## Integration Patterns

### MCP Protocol Compliance
- **Tool Registration**: Standard MCP server pattern
- **Schema Definition**: Zod schemas for input validation
- **Response Format**: MCP-compliant content structure
- **Error Handling**: MCP error propagation

### Wildlife Insights API Integration
- **Authentication**: Bearer token management
- **Query Structure**: GraphQL with proper variable types
- **Error Parsing**: GraphQL error extraction and handling
- **Rate Limiting**: Implicit through error handling

## Performance Considerations

### Current Optimizations
- **Efficient Queries**: Minimal field selection
- **Pagination Support**: Handle large datasets
- **Connection Reuse**: Single GraphQL client instance
- **Error Caching**: Avoid redundant failed requests

### Future Optimizations
- **Response Caching**: Cache frequently accessed data
- **Batch Processing**: Optimize bulk operations
- **Lazy Loading**: Load complex data on demand
- **Background Processing**: Async operations for large datasets

## Security Patterns

### Authentication Management
- **Token Storage**: Environment variables preferred
- **Runtime Updates**: Session-based token management
- **Secure Defaults**: No tokens stored in code

### Input Validation
- **Schema Validation**: Zod schemas for all inputs
- **Type Safety**: TypeScript throughout
- **Error Sanitization**: Remove sensitive data from errors

## Testing Strategy

### Unit Testing (Future)
- **Tool Functions**: Test individual tool logic
- **Helper Functions**: Validate Texas species logic
- **Error Handling**: Verify error message quality

### Integration Testing (Current)
- **MCP Connection**: Verify server starts and connects
- **GraphQL Queries**: Test against real API
- **Authentication**: Validate token handling

### User Acceptance Testing
- **Tool Names**: Ensure intuitive naming
- **Error Messages**: Verify helpfulness
- **Workflow Efficiency**: Validate identification process

## Deployment Patterns

### Development Deployment
```bash
npm run dev  # TSX for hot reloading
```

### Production Deployment
```bash
npm run build  # TypeScript compilation
npm start      # Node.js execution
```

### Environment Configuration
```bash
# Required
WI_GRAPHQL_ENDPOINT=https://api.wildlifeinsights.org/graphql
WI_BEARER_TOKEN=your_token_here

# Optional
WI_USER_AGENT=wi-mcp/0.2.1
WI_TIMEOUT_MS=60000
```

## Maintenance Patterns

### Code Organization
- **Single File**: All tools in `src/server.ts` for simplicity
- **Helper Functions**: Inline for easy modification
- **Type Definitions**: Inline with usage

### Update Procedures
1. **Schema Changes**: Update GraphQL queries and types
2. **New Tools**: Add to server registration
3. **Bug Fixes**: Test against real API
4. **Memory Bank**: Update documentation

### Version Management
- **Semantic Versioning**: Based on feature completeness
- **Breaking Changes**: Major version bumps for API changes
- **Deprecation**: Clear warnings for removed features
