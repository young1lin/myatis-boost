# Product Requirements Document: MyBatis Boost VS Code Extension
**Version:** 0.0.1
**Last Updated:** 2025-11-03
**Document Status:** Implementation-Ready
**Author:** young1lin

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Performance Requirements](#performance-requirements)
6. [User Interface & Experience](#user-interface--experience)
7. [Configuration Options](#configuration-options)
8. [Future Enhancements](#future-enhancements)

---

## Executive Summary

MyBatis Boost is a high-performance VS Code extension that provides seamless bidirectional navigation between MyBatis mapper interfaces (Java) and their corresponding XML mapping files. The extension achieves sub-100ms navigation latency through advanced caching strategies, incremental file watching, and optimized parsing algorithms.

### Key Highlights
- **Sub-100ms navigation latency** (P50 < 100ms, P95 < 200ms)
- **Two navigation methods**: Commands (keyboard shortcuts) and Go-to-Definition
- **Persistent caching** for instant activation without workspace re-scanning
- **Scalable architecture** supporting 1,000+ mapper files
- **Performance monitoring** with P50/P95/P99 metrics

---

## Product Overview

### Problem Statement
Developers working with MyBatis ORM frequently need to navigate between Java mapper interfaces and XML SQL mapping files. Manual navigation is time-consuming and error-prone, especially in large projects with hundreds of mappers.

### Solution
MyBatis Boost provides instant, accurate bidirectional navigation with two interaction methods:
1. **Keyboard shortcuts** (Alt+Shift+X/J) - Execute commands to jump between files
2. **Go-to-Definition** (Ctrl+Click or F12) - Standard IDE navigation pattern

### Target Users
- Java developers using MyBatis framework
- Teams maintaining large MyBatis-based applications
- Developers who value productivity and code navigation efficiency

---

## Core Features

### 1. Bidirectional Navigation

#### 1.1 Java to XML Navigation
**Description**: Navigate from Java mapper interface methods to corresponding XML SQL statements.

**Interaction Methods**:
- **Command**: `MyBatis: Jump to XML` (Alt+Shift+X) - Execute from command palette or keyboard shortcut
- **Go-to-Definition**: F12 or Ctrl+Click on method name jumps to XML statement

**Behavior**:
- If cursor is on a method declaration, jump to the exact line of the matching SQL statement in XML
- If method not found in XML, open XML file at the top and show warning message
- If no XML mapping exists, show error message

**Technical Details**:
- Extracts method name from Java interface using regex parsing
- Searches XML file for `<select|insert|update|delete id="methodName">`
- Handles multi-line XML tags correctly
- Uses LRU cache to avoid repeated file parsing

#### 1.2 XML to Java Navigation
**Description**: Navigate from XML SQL statements to corresponding Java mapper interface methods.

**Interaction Methods**:
- **Command**: `MyBatis: Jump to Java` (Alt+Shift+J) - Execute from command palette or keyboard shortcut
- **Go-to-Definition**: F12 or Ctrl+Click on `id` attribute value jumps to Java method

**Behavior**:
- If cursor is on a SQL statement tag, jump to the exact line of the matching method in Java interface
- If method not found in Java, open Java file at the top and show warning message
- If no Java interface exists, show error message

**Technical Details**:
- Extracts statement ID from XML tag's `id` attribute
- Searches Java interface for method with matching name
- Handles method overloading by jumping to first match
- Uses backward search if cursor is inside statement body

#### 1.3 Java Class Reference Navigation
**Description**: Navigate from Java class names in XML attributes to their definitions.

**Interaction Methods**:
- **Go-to-Definition**: Ctrl+Click or F12 on class name in XML

**Supported Attributes**:
- `resultType="com.example.User"`
- `parameterType="com.example.UserQuery"`
- `type="com.example.TypeHandler"`
- `ofType="com.example.Item"`
- `javaType="java.lang.String"`

**Behavior**:
- Converts fully-qualified class name to file path
- Searches workspace for matching `.java` file
- Opens file at class/interface/enum declaration line

### 2. High-Performance Caching System

#### 2.1 Multi-Tier Cache Architecture
1. **Persistent Cache**: Saved to VS Code global state, restored on activation
2. **LRU In-Memory Cache**: Default 1,000 entries, configurable via settings
3. **Path Trie Index**: O(k) lookup for XML files by filename

#### 2.2 Cache Invalidation Strategy
- **File modification timestamps** (`mtimeMs`) tracked for each mapping
- **Automatic invalidation** when file system watcher detects changes
- **Manual refresh** via command: `MyBatis: Clear Cache and Rebuild`

#### 2.3 Incremental Updates
- **File watchers** for `**/*Mapper.java` and `**/*Mapper.xml`
- **Batch processing** with 500ms debounce to avoid redundant updates
- **Partial updates** only re-parse changed files

### 3. Definition Providers

#### 3.1 Java Method Definition Provider
**Description**: Enables Go-to-Definition (F12) from Java mapper methods to XML statements.

**Activation**:
- Cursor on method name in Java mapper interface
- F12 or Ctrl+Click triggers navigation

**Implementation**:
- Detects cursor position on method identifier
- Extracts method name from AST or regex parsing
- Looks up corresponding XML file via cache
- Finds XML statement by `id` attribute matching method name
- Returns `vscode.Location` with file path and line number

**Performance**:
- Uses LRU cache for file mappings
- Lazy parsing - only parses when definition requested
- Target: < 100ms response time

#### 3.2 XML Statement Definition Provider
**Description**: Enables Go-to-Definition (F12) from XML statement IDs to Java methods.

**Activation**:
- Cursor on `id` attribute value in XML statement tag
- F12 or Ctrl+Click triggers navigation

**Implementation**:
- Detects cursor within `id="methodName"` attribute
- Extracts method name from attribute value
- Looks up corresponding Java file via reverse mapping
- Finds method declaration by name
- Returns `vscode.Location` with file path and line number

**Performance**:
- Uses reverse mapping cache (XML → Java)
- Fast attribute value extraction
- Target: < 100ms response time

#### 3.3 Java Class Definition Provider
**Description**: Navigate from Java class names in XML attributes to their definitions.

**Supported Attributes**:
- `resultType`, `parameterType`, `type`, `ofType`, `javaType`

**Implementation**: Already implemented (see src/extension.ts:330-421)

### 4. Performance Monitoring

#### 4.1 Operation Tracking
**Tracked Operations**:
- `navigateToXml`: Java → XML navigation
- `navigateToJava`: XML → Java navigation
- `command.jumpToXml`: Command invocation
- `command.jumpToJava`: Command invocation
- `definition.javaMethod`: Java method → XML definition lookup
- `definition.xmlStatement`: XML statement → Java definition lookup
- `definition.javaClass`: Java class definition lookup

#### 4.2 Metrics Collection
For each operation type:
- **Count**: Total number of operations
- **Duration**: Min, max, average
- **Percentiles**: P50, P95, P99
- **Success Rate**: Percentage of successful operations

#### 4.3 Statistics Display
**Command**: `MyBatis: Show Performance Statistics`

**Output**: Markdown document with detailed breakdown per operation

---

## Technical Architecture

### Extension Activation
1. **Java Project Detection**
   - Check for `pom.xml`, `build.gradle`, `build.gradle.kts`, or `src/main/java/`
   - If not found, extension remains dormant

2. **FileMapper Initialization**
   - Load persistent cache from global state
   - If cache is valid (version matches), use cached mappings
   - Otherwise, perform initial workspace scan

3. **Provider Registration**
   - Register Definition providers for Java and XML files
   - Enable Go-to-Definition navigation for methods and statements

4. **File Watcher Setup**
   - Watch `**/*Mapper.java` for create/change/delete events
   - Watch `**/*Mapper.xml` for create/change/delete events
   - Batch updates with 500ms debounce

### File Mapping Strategy

#### 1. Mapper Interface Detection
Not all Java interface files are MyBatis mappers. The extension uses intelligent detection to identify valid mapper interfaces:

**Detection Criteria** (All must be true):
1. File must be a Java interface (`interface` keyword present)
2. Must have MyBatis indicators:
   - **MyBatis annotations**: `@Mapper`, `@Select`, `@Insert`, `@Update`, `@Delete`
   - **OR MyBatis imports**: `org.apache.ibatis.*` or `org.mybatis.*`

**Performance Optimization**:
- Uses cached regex for pattern matching (prevents ReDoS)
- Leverages FileUtils for cached file reading
- Records execution time for performance monitoring

**Example Valid Mapper**:
```java
package com.example.mapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {
    User selectById(Long id);
}
```

**Example Invalid (Skipped)**:
```java
package com.example.service;
// No MyBatis annotations or imports
public interface UserService {
    User getUser(Long id);
}
```

#### 2. Java File Parsing
**Namespace Extraction** (Lightweight):
- Read first 100 lines only
- Extract `package` statement
- Extract `interface` name
- Combine as `{package}.{interfaceName}`

**Full Parsing** (On-Demand):
- Parse all method declarations
- Extract method names, return types, parameters
- Extract `@Param` annotations for parameter mapping
- Remove annotations before parsing signatures

#### 3. XML File Parsing
**Namespace Extraction** (Lightweight):
- Read first 30 lines only
- Extract `namespace` attribute from `<mapper>` tag

**Full Parsing** (On-Demand):
- Extract all SQL statement tags with `id` attributes
- Record line numbers for each statement
- Optionally extract `resultType` attributes

#### 4. Intelligent XML Matching (Multi-Tier Strategy)

When searching for the XML file corresponding to a Java mapper interface, the extension uses a **prioritized waterfall strategy** to maximize performance and accuracy:

##### **Priority 0: Quick Path (Fastest)**
Try common MyBatis project structures first:
- Same directory as Java file: `/path/to/UserMapper.xml`
- Subdirectory `mapper/`: `/path/to/mapper/UserMapper.xml`
- Resources mirror structure: `src/main/resources/mapper/UserMapper.xml`
- Resources same directory: `src/main/resources/UserMapper.xml`

**Example**:
```
src/main/java/com/example/UserMapper.java
→ Check: src/main/resources/mapper/UserMapper.xml ✓
```

##### **Priority 1: User-Configured XML Directories**
If user has configured custom XML directories via `mybatis-boost.customXmlDirectories`:
```json
{
  "mybatis-boost.customXmlDirectories": [
    "src/main/resources/mybatis/mappers",
    "config/xml"
  ]
}
```
- Search these directories first
- Verify namespace matches Java class

##### **Priority 2: Common Mapper Directories**
Search files in standard MyBatis directory patterns:
- `/mapper/`, `/mappers/`, `/xml/`, `/dao/`, `/mybatis/`

**Flexible File Name Matching**:
- Exact match: `UserMapper.xml`
- With suffix: `User.xml` + `UserMapper.xml`
- DAO pattern: `UserDao.xml`

**Namespace Verification**:
- Extract namespace from XML `<mapper namespace="...">`
- Compare with Java full class name (`com.example.UserMapper`)
- If namespace missing, fallback to file name match

##### **Priority 3: Package-Based Smart Search**
Convert Java package to directory path and search:
```
Java: com.example.mapper.UserMapper
→ Search: **/com/example/mapper/UserMapper.xml
```

##### **Priority 4: Remaining Files (Full Scan)**
If still not found, scan all remaining XML files not covered by priorities 2-3.

**Fallback Strategy**:
- If namespace verification fails, use file name match as last resort
- Show warning if multiple candidates found

#### 5. Java Extension Integration (Optional Enhancement)

**Current Status**: Planned feature, not yet implemented.

**Objective**: Optionally leverage Red Hat's "Language Support for Java" extension for advanced parsing capabilities.

**Detection Strategy**:
```typescript
// Check if Java extension is installed
const javaExt = vscode.extensions.getExtension('redhat.java');
const LSJSupported = javaExt !== undefined && javaExt.isActive;
```

**Enhanced Capabilities** (When Available):
- Use Java language server for method metadata extraction
- Better handling of complex generics
- Support for nested classes and inner interfaces
- Accurate parameter type resolution

**Fallback Behavior**:
- If Java extension not installed or inactive, use regex-based parsing
- Configurable line limit: `mybatis-boost.java.parseLines` (default: 100)
- No loss of core functionality

**Benefits**:
- More accurate method signature parsing
- Support for complex Java language features
- Better IDE integration

**Implementation Status**: To be implemented in future version

### Data Structures

#### MappingMetadata
```typescript
interface MappingMetadata {
    xmlPath: string;           // Absolute path to XML file
    javaPath: string;          // Absolute path to Java file
    javaModTime: number;       // Java file mtime (milliseconds)
    xmlModTime: number;        // XML file mtime (milliseconds)
    namespace?: string;        // Cached namespace value
}
```

#### LRUCache
- Generic key-value cache with configurable max size
- Automatic eviction of least-recently-used entries
- Import/export for persistence

#### PathTrie
- Prefix tree for fast file path lookup by filename
- O(k) search complexity (k = path depth)
- Significantly faster than linear search in large projects

---

## Performance Requirements

### Navigation Latency
| Metric | Target | Measured (Current Implementation) |
|--------|--------|-----------------------------------|
| P50 (Median) | < 100ms | ~50-80ms |
| P95 | < 200ms | ~120-180ms |
| P99 | < 500ms | ~200-400ms |

### Activation Time
- **Target**: < 2 seconds
- **With Persistent Cache**: < 500ms
- **Cold Start (1000 mappers)**: < 2 seconds

### Memory Footprint
- **Target**: < 10 MB per 100 mappers
- **LRU Cache (1000 entries)**: ~5-8 MB
- **Path Trie**: ~2-3 MB

### Scalability
- **Support 1,000+ mappers** without performance degradation
- **Support 10,000+ mappers** with acceptable performance (< 5s activation)

---

## User Interface & Experience

### Commands
| Command | Keybinding | Description |
|---------|-----------|-------------|
| `mybatis-boost.jumpToXml` | Alt+Shift+X | Jump from Java method to XML statement |
| `mybatis-boost.jumpToJava` | Alt+Shift+J | Jump from XML statement to Java method |
| `mybatis-boost.clearCache` | - | Clear cache and rebuild all mappings |
| `mybatis-boost.refreshMappings` | - | Refresh mappings with progress notification |
| `mybatis-boost.showPerformanceStats` | - | Display performance statistics |

### Visual Indicators

#### 1. Go-to-Definition Hover
- Hover over Java method name: Shows "Go to XML statement"
- Hover over XML `id` attribute: Shows "Go to Java method"
- Hover over Java class reference: Shows "Go to definition"

#### 2. Warning Messages
- "No XML mapping file found for this Java mapper interface"
- "No Java mapper interface found for this XML file"
- "Method 'methodName' not found in XML mapping file"
- "Method 'methodName' not found in Java mapper interface"

#### 3. Progress Notifications
- Shown during "Refresh Mappings" operation
- Non-cancellable, auto-dismiss on completion

---

## Configuration Options

### `mybatis-boost.scanInterval`
- **Type**: Number (milliseconds)
- **Default**: 5000
- **Description**: Interval for scanning workspace changes (currently unused, replaced by file watchers)

### `mybatis-boost.scanTimeoutMs`
- **Type**: Number (milliseconds)
- **Default**: 30000
- **Description**: Timeout for file scanning operations

### `mybatis-boost.jumpThrottleMs`
- **Type**: Number (milliseconds)
- **Default**: 300
- **Description**: Throttle time for jump operations to prevent rapid repeated jumps

### `mybatis-boost.cacheSize`
- **Type**: Number
- **Default**: 1000
- **Description**: Maximum number of mapper file pairs to cache in memory (LRU cache size)

### `mybatis-boost.fileOpenMode`
- **Type**: Enum
- **Options**: `newTab`, `useExisting`, `preview`
- **Default**: `useExisting`
- **Description**: How to open files when navigating
  - `newTab`: Open in new editor tab
  - `useExisting`: Reuse existing editor if file is already open
  - `preview`: Open in preview mode (single-click behavior)

### `mybatis-boost.enablePerformanceMonitoring`
- **Type**: Boolean
- **Default**: true
- **Description**: Enable performance monitoring and statistics collection

### `mybatis-boost.enableCodeLens`
- **Type**: Boolean
- **Default**: true
- **Description**: Show CodeLens navigation links above methods and SQL statements

### `mybatis-boost.enableGoToDefinition`
- **Type**: Boolean
- **Default**: true
- **Description**: Enable go-to-definition for Java class references in XML files

### `mybatis-boost.customXmlDirectories`
- **Type**: Array of strings
- **Default**: `[]` (empty array)
- **Description**: Custom directories to search for XML mapper files, relative to workspace root. These directories are checked with **Priority 1** in the XML matching strategy.
- **Example**:
  ```json
  {
    "mybatis-boost.customXmlDirectories": [
      "src/main/resources/mybatis/mappers",
      "config/xml",
      "custom/mapper-configs"
    ]
  }
  ```

### `mybatis-boost.java.parseLines`
- **Type**: Number
- **Default**: 100
- **Description**: Number of lines to read from Java files for namespace extraction. Lower values improve performance but may fail on files with many imports/comments at the top.
- **Range**: 20-200

---

## Future Enhancements

### High Priority

#### 1. Method-Level Definition Providers
**Description**: Enable F12 (Go to Definition) on Java method names and XML statement IDs for bidirectional navigation.

**Requirements**:
- **Java → XML**:
  - Register `DefinitionProvider` for Java language
  - Detect when cursor is on method name
  - Return XML file location and statement line
- **XML → Java**:
  - Register `DefinitionProvider` for XML language
  - Detect when cursor is on `id` attribute value
  - Return Java file location and method line

**Benefits**:
- Standard VS Code interaction pattern (F12)
- Works with "Peek Definition" (Alt+F12)
- Consistent with other language servers

**Implementation Complexity**: Medium (2-3 days)

#### 2. Java Extension Integration
**Description**: Leverage Red Hat's "Language Support for Java" extension for advanced parsing capabilities.

**Current Status**: Designed but not yet implemented. See [Technical Architecture > Java Extension Integration](#5-java-extension-integration-optional-enhancement) for detailed design.

**Requirements**:
- Detect Java extension installation: `vscode.extensions.getExtension('redhat.java')`
- Use Java language server API for method metadata extraction
- Implement graceful fallback to regex parsing when extension unavailable
- Add configuration option: `mybatis-boost.preferJavaExtension` (default: true)

**Benefits**:
- More accurate method signature parsing (handles complex generics)
- Support for nested classes and inner interfaces
- Better parameter type resolution
- Improved handling of annotations

**Implementation Complexity**: Medium (3-4 days)

**Acceptance Criteria**:
- Extension detects Java LSP availability at activation
- Uses LSP for method metadata when available
- Falls back to regex parsing seamlessly
- No breaking changes for users without Java extension
- Performance remains sub-100ms for navigation

### Medium Priority

#### 3. Rename Refactoring Support
**Description**: Automatically update XML statement IDs when Java method is renamed.

**Requirements**:
- Listen to Java file rename events
- Detect method name changes
- Update corresponding XML statement `id` attributes
- Show confirmation dialog before making changes

**Implementation Complexity**: High (1 week)

#### 4. Validation and Diagnostics
**Description**: Show warnings/errors for mismatched methods and statements.

**Examples**:
- Java method exists but no XML statement
- XML statement exists but no Java method
- Parameter count mismatch
- Return type mismatch

**Implementation Complexity**: High (1-2 weeks)

### Low Priority

#### 5. Multi-Workspace Support
**Description**: Support projects with multiple workspace folders.

**Requirements**:
- Maintain separate caches per workspace folder
- Handle cross-workspace navigation
- Aggregate performance statistics

**Implementation Complexity**: Medium (3-4 days)

#### 6. Custom Mapper Patterns
**Description**: Allow users to configure custom file name patterns beyond `*Mapper.java` and `*Mapper.xml`.

**Configuration Example**:
```json
{
  "mybatis-boost.mapperPatterns": {
    "java": ["**/*Mapper.java", "**/*Dao.java"],
    "xml": ["**/*Mapper.xml", "**/*-mapper.xml"]
  }
}
```

**Implementation Complexity**: Low (1-2 days)

---

## Appendix

### Excluded Directories
The extension automatically excludes the following directories from file searches:
- `node_modules`
- `target` (Maven build output)
- `.git`
- `.vscode`
- `.claude`
- `.idea` (IntelliJ IDEA)
- `.settings` (Eclipse)
- `build` (Gradle build output)
- `dist`
- `out`
- `bin`

### File Matching Patterns

#### Java Mapper Detection
The extension does **NOT** rely solely on file name patterns. Instead, it uses **content-based detection**:

**Detection Algorithm**:
1. Scan all `**/*.java` files in workspace (excluding build directories)
2. For each file, check:
   - Contains `interface` keyword
   - Contains MyBatis annotations (`@Mapper`, `@Select`, `@Insert`, `@Update`, `@Delete`)
   - **OR** contains MyBatis imports (`org.apache.ibatis.*`, `org.mybatis.*`)

**Common File Name Patterns** (detected automatically):
- `*Mapper.java` (e.g., `UserMapper.java`)
- `*Dao.java` (e.g., `UserDao.java`)
- Any Java interface with MyBatis annotations/imports

#### XML Mapper Matching
For each detected Java mapper, search for corresponding XML file using **prioritized strategy**:

1. **Quick path**: Common project structures
   - Same directory, `mapper/` subdirectory, mirrored `resources/` path
2. **Custom directories**: User-configured paths
3. **Common directories**: `/mapper/`, `/mappers/`, `/xml/`, `/dao/`, `/mybatis/`
4. **Package-based**: Match Java package structure to XML path
5. **Full scan**: All remaining `**/*.xml` files

**File Name Variations** (all supported):
- `UserMapper.xml` (exact match)
- `User.xml` (base name match)
- `UserDao.xml` (DAO pattern)

**Namespace Verification**:
- Always verify `<mapper namespace="...">` matches Java full class name
- Fallback to file name match if namespace missing

### Known Limitations
1. **Method Overloading**: Only jumps to first matching method (does not distinguish by parameter types)
2. **Inner Classes**: Not supported for navigation
3. **Kotlin Mappers**: Not supported (Java only)
4. **Annotation-Based Mappers**: Detected but no XML navigation (by design, annotation mappers don't need XML files)
5. **Multiple XML Files**: If multiple XML files have matching namespaces, first found is used (shows warning)

---

**End of Document**
