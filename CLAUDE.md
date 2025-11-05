# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyBatis Boost is a high-performance VS Code extension for bidirectional navigation between MyBatis mapper interfaces (Java) and XML mapping files. It achieves sub-100ms navigation latency through LRU caching, file watchers, and optimized parsing.

## Essential Commands

### Development Build & Testing
```bash
# Install dependencies
pnpm install

# Development build (includes type checking and linting)
pnpm run compile

# Watch mode for development
pnpm run watch

# Production build
pnpm run package

# Run all tests (unit + integration)
pnpm test

# Run only unit tests
pnpm run test:unit

# Run only integration tests
pnpm run test:integration

# Type checking without build
pnpm run check-types

# Linting
pnpm run lint
```

### Testing Individual Files
```bash
# Run single unit test file
pnpm exec mocha --require ts-node/register src/test/unit/FileMapper.test.ts

# Debug extension in VS Code
# Press F5 to launch Extension Development Host
```

## Architecture Highlights

### Core Design Patterns

**Modular Structure**: All navigation logic is encapsulated in `src/navigator/` module:
- `core/FileMapper.ts`: Java-XML mapping with LRU cache (default 5000 entries)
- `parsers/`: Lightweight parsing (Java: first 100 lines, XML: first 30 lines)
- `providers/`: 5 DefinitionProviders for different navigation scenarios

**Performance Strategy**:
- **LRU Cache**: Stores MappingMetadata with modification timestamps for staleness detection
- **File Watchers**: Incremental updates for `**/*.java` and `**/*.xml` files
- **Quick Path Matching**: Priority-based XML discovery (common structures → custom dirs → full scan)
- **Lazy Parsing**: Full file parsing only when definition is requested

**MyBatis Mapper Detection**: Uses content-based detection (not just filename patterns):
- Must be Java `interface`
- Must contain MyBatis annotations (`@Mapper`, `@Select`, etc.) OR imports (`org.apache.ibatis.*`, `org.mybatis.*`)

### Navigation Capabilities

The extension provides **7 types of Go-to-Definition navigation**:
1. Java interface name → XML `<mapper>` tag
2. Java method name → XML SQL statement (`<select>`, `<insert>`, etc.)
3. XML `namespace` attribute → Java interface
4. XML statement `id` attribute → Java method
5. XML class references (`resultType`, `parameterType`) → Java class
6. XML `<include refid="xxx">` → `<sql id="xxx">` fragment
7. XML `<sql id="xxx">` → All `<include>` references
8. XML `<result property="xxx">` → Java field in resultMap type class

### XML File Matching Strategy (Priority Order)

When finding XML for a Java mapper, the extension uses a waterfall approach:

1. **Priority 0 - Quick Paths**: Common structures (same dir, `mapper/` subdir, mirrored `resources/` path)
2. **Priority 1 - Custom Directories**: User-configured via `mybatis-boost.customXmlDirectories`
3. **Priority 2 - Common Patterns**: `/mapper/`, `/mappers/`, `/xml/`, `/dao/`, `/mybatis/`
4. **Priority 3 - Package-Based**: Convert Java package to path (e.g., `com.example.UserMapper` → `**/com/example/UserMapper.xml`)
5. **Priority 4 - Full Scan**: All remaining XML files with namespace verification

### Key Data Structures

**MappingMetadata** (src/types.ts):
```typescript
interface MappingMetadata {
    xmlPath: string;      // Absolute path to XML
    javaPath: string;     // Absolute path to Java
    javaModTime: number;  // For cache invalidation
    xmlModTime: number;   // For cache invalidation
    namespace?: string;   // Cached namespace
}
```

**LRUCache** (src/navigator/core/FileMapper.ts):
- Generic `Map`-based implementation
- Auto-evicts least recently used entries when size limit reached
- Bidirectional mapping: both `javaPath` and `xmlPath` keys point to same metadata

### Important Configuration

Settings in `package.json` that affect behavior:
- `mybatis-boost.cacheSize` (default: 5000): LRU cache size
- `mybatis-boost.customXmlDirectories` (default: []): Custom XML search paths (Priority 1)
- `mybatis-boost.javaParseLines` (default: 100): Lines to read for namespace extraction

### Extension Activation

**Activation Triggers**: Only activates if workspace contains Java project indicators:
- `pom.xml` (Maven)
- `build.gradle` or `build.gradle.kts` (Gradle)
- `src/main/java/` directory

**Initialization Flow**:
1. Detect Java project → activate extension
2. Initialize FileMapper with configured cache size
3. Setup file watchers for `**/*.java` and `**/*.xml`
4. Scan workspace for MyBatis mappers (content-based detection)
5. Register 5 DefinitionProviders for Java and XML

### Excluded Directories

File searches automatically skip: `node_modules`, `target`, `.git`, `.vscode`, `.claude`, `.idea`, `.settings`, `build`, `dist`, `out`, `bin`

## Development Guidelines

### Adding New Navigation Features

1. Create new DefinitionProvider in `src/navigator/providers/`
2. Export it from `src/navigator/index.ts`
3. Register in `src/extension.ts` activation function
4. Add tests in `src/test/integration/` or `src/test/unit/`

### Parser Modifications

- **Java Parser**: Modify `src/navigator/parsers/javaParser.ts`
  - Keep namespace extraction lightweight (first 100 lines)
  - Full method parsing is on-demand only
- **XML Parser**: Modify `src/navigator/parsers/xmlParser.ts`
  - Namespace extraction reads first 30 lines
  - Statement extraction processes entire file

### Performance Requirements

Maintain these targets:
- **P50 navigation latency**: < 100ms
- **P95 navigation latency**: < 200ms
- **Activation time**: < 2s (cold start with 1000 mappers)
- **Memory per 100 mappers**: < 10 MB

## Testing Strategy

### Test Structure
- `src/test/unit/`: Fast unit tests for parsers and FileMapper
- `src/test/integration/`: Integration tests for DefinitionProviders
- Test fixtures: `src/test/fixtures/sample-mybatis-project/`

### Running Tests
- **Mocha** for unit tests (fast, no VS Code API)
- **@vscode/test-electron** for integration tests (requires VS Code API)

## Known Limitations

1. **Method Overloading**: Jumps to first matching method (no parameter type distinction)
2. **Inner Classes**: Not supported for navigation
3. **Kotlin Mappers**: Java only
4. **Multiple XML Files**: First found with matching namespace is used
