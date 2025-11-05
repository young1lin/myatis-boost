# MyBatis Boost

High-performance bidirectional navigation between MyBatis mapper interfaces (Java) and their corresponding XML mapping files.

## Features

### 🚀 Fast Navigation via Go-to-Definition

**Java ↔ XML:**
- **F12 or Ctrl+Click** on Java **interface name** → XML `<mapper>` tag
- **F12 or Ctrl+Click** on Java **method name** → XML SQL statement
- **F12 or Ctrl+Click** on XML **namespace** attribute → Java interface
- **F12 or Ctrl+Click** on XML **statement ID** → Java method

**XML SQL Fragment References:**
- **F12 or Ctrl+Click** on `<include refid="xxx">` → `<sql id="xxx">` definition
- **F12 or Ctrl+Click** on `<sql id="xxx">` → Shows all `<include>` references

**Java Class References:**
- **F12 or Ctrl+Click** on Java class names in XML attributes → class definitions
- Supports `resultType`, `parameterType`, `type`, `ofType`, `javaType`

**Other Features:**
- Smart detection of MyBatis mapper files (via `@Mapper` annotation or MyBatis imports)

### 💾 Intelligent Caching
- **LRU cache** with configurable size (default: 1000 entries)
- **Automatic cache invalidation** on file changes
- **Incremental updates** via file system watchers
- **Batch update processing** for optimal performance

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build the extension:
   ```bash
   pnpm run compile
   ```
4. Press F5 to launch Extension Development Host

## Usage

### Go-to-Definition Navigation

**1. Java Interface → XML Mapper:**
```java
public interface UserMapper {  // ← Ctrl+Click on "UserMapper" to jump to XML <mapper> tag
    User findById(Long id);
}
```

**2. Java Method → XML Statement:**
```java
public interface UserMapper {
    User findById(Long id);  // ← Ctrl+Click on "findById" to jump to XML <select id="findById">
}
```

**3. XML Namespace → Java Interface:**
```xml
<mapper namespace="com.example.mapper.UserMapper">
  <!--              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ Ctrl+Click to jump to Java interface -->
</mapper>
```

**4. XML Statement ID → Java Method:**
```xml
<select id="findById" resultType="com.example.User">
  <!--      ^^^^^^^^ Ctrl+Click to jump to Java method -->
  SELECT * FROM users WHERE id = #{id}
</select>
```

**5. Java Class References:**
```xml
<select id="findUser" resultType="com.example.User">
  <!--                            ^^^^^^^^^^^^^^^^ Ctrl+Click to jump to User class definition -->
  SELECT * FROM users WHERE id = #{id}
</select>
```

**6. SQL Fragment References (within same XML):**
```xml
<!-- Define reusable SQL fragment -->
<sql id="Base_Column_List">
  <!--  ^^^^^^^^^^^^^^^^^ Ctrl+Click shows all references to this fragment -->
  id, name, email, created_at, updated_at
</sql>

<!-- Use SQL fragment -->
<select id="findById" resultType="com.example.User">
  SELECT <include refid="Base_Column_List" /> FROM users WHERE id = #{id}
    <!--             ^^^^^^^^^^^^^^^^^ Ctrl+Click jumps to sql fragment definition -->
</select>
```

### Commands

| Command | Description |
|---------|-------------|
| MyBatis: Clear Cache and Rebuild | Clear all cached mappings and rebuild |
| MyBatis: Refresh Mappings | Refresh mappings with progress indicator |

## Configuration

Open VS Code settings and search for "MyBatis Boost":

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `mybatis-boost.cacheSize` | number | 1000 | Maximum number of mapper pairs to cache |
| `mybatis-boost.customXmlDirectories` | array | [] | Custom directories to search for XML files |
| `mybatis-boost.javaParseLines` | number | 100 | Number of lines to read for namespace extraction |

## Architecture

### Caching System

- **LRU Memory Cache**: Recently used mappings kept in memory (configurable size)
- **Automatic cache invalidation** on file changes via file system watchers
- **Modification timestamp tracking** for cache validation

### File Mapping Strategy

1. **MyBatis Mapper Detection**: Scans Java files for `@Mapper` annotations or MyBatis imports
2. **Namespace Extraction**: Reads first N lines to extract package + interface name
3. **XML File Matching**: Uses intelligent search strategy to find corresponding XML files
4. **Incremental Updates**: File watchers automatically update cache on file changes

## Development

### Building

```bash
# Development build
pnpm run compile

# Watch mode
pnpm run watch

# Production build
pnpm run package
```

### Testing

```bash
# Run all tests
pnpm test

# Watch tests
pnpm run watch-tests

# Type checking
pnpm run check-types

# Linting
pnpm run lint
```

### Project Structure

```
src/
├── extension.ts                        # Main entry point and activation
├── types.ts                            # TypeScript type definitions
├── core/
│   └── FileMapper.ts                   # File mapper with LRU caching
├── providers/
│   ├── JavaToXmlDefinitionProvider.ts  # Java method → XML navigation
│   ├── XmlToJavaDefinitionProvider.ts  # XML statement → Java navigation
│   └── JavaClassDefinitionProvider.ts  # Java class reference navigation
├── parsers/
│   ├── javaParser.ts                   # Java file parsing utilities
│   └── xmlParser.ts                    # XML file parsing utilities
├── utils/
│   ├── fileUtils.ts                    # File I/O utilities
│   └── javaExtensionAPI.ts             # Java language server integration
└── test/
    └── extension.test.ts               # Extension integration tests
```

## Troubleshooting

### Navigation Not Working

1. Ensure the Java file has MyBatis annotations (`@Mapper`) or imports
2. Check that the XML file has a matching `namespace` attribute
3. Try clearing cache: "MyBatis: Clear Cache and Rebuild"

### Mappings Not Updating

1. File watchers may be disabled in large workspaces
2. Manually refresh: "MyBatis: Refresh Mappings"
3. Check VS Code file watcher limit: `files.watcherExclude`

### Extension Not Activating

1. Ensure workspace contains a Java project:
   - `pom.xml` (Maven)
   - `build.gradle` or `build.gradle.kts` (Gradle)
   - `src/main/java` directory
2. Check VS Code Output panel for errors
3. Restart VS Code

## Requirements

- VS Code 1.99.3 or higher
- Java project with MyBatis mappers
- Node.js 22.x or higher (for development)

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass: `pnpm test`
2. Code is linted: `pnpm run lint`
3. Performance targets are met (< 100ms P50, < 200ms P95)
4. Changes are documented in CLAUDE.md

## License

MIT

## Changelog

### 0.0.1 (Current)
- ✨ **7 types of Go-to-Definition navigation** (F12/Ctrl+Click):
  1. Java interface name → XML `<mapper>` tag
  2. Java method name → XML SQL statement
  3. XML namespace attribute → Java interface
  4. XML statement ID → Java method
  5. Java class references in XML → Java class definition
  6. `<include refid>` → `<sql id>` fragment definition
  7. `<sql id>` → All `<include>` references (shows all usages)
- ✨ LRU cache with configurable size
- ✨ Automatic cache invalidation on file changes
- ✨ File system watchers for incremental updates
- ✨ Smart MyBatis mapper detection (via `@Mapper` or imports)
- ✨ Multi-line tag parsing support
- ✨ Configurable settings
