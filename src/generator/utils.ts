/**
 * Utility functions for DDL parsing
 */

import { DateTimeType, SqlType } from './type';

/**
 * SQL type to Java type mapping (wrapper types only)
 * Key: Normalized SQL type (uppercase, no parameters)
 * Value: Java wrapper type
 */
const SQL_TO_JAVA_TYPE_MAP: Map<string, string> = new Map([
  // String types - Common across databases
  ['VARCHAR', 'String'],
  ['CHAR', 'String'],
  ['TEXT', 'String'],
  ['LONGTEXT', 'String'],
  ['MEDIUMTEXT', 'String'],
  ['TINYTEXT', 'String'],

  // Oracle specific string types
  ['VARCHAR2', 'String'],
  ['CLOB', 'String'],
  ['NVARCHAR', 'String'],
  ['NCHAR', 'String'],
  ['NCLOB', 'String'],

  // Integer types - Wrapper types only
  ['TINYINT', 'Integer'],
  ['SMALLINT', 'Integer'],
  ['MEDIUMINT', 'Integer'],
  ['INT', 'Integer'],
  ['INTEGER', 'Integer'],

  // Long types
  ['BIGINT', 'Long'],
  ['SERIAL', 'Long'],      // PostgreSQL auto-increment
  ['BIGSERIAL', 'Long'],   // PostgreSQL auto-increment
  ['NUMBER', 'Long'],      // Oracle (without precision)

  // Decimal types
  ['DECIMAL', 'BigDecimal'],
  ['NUMERIC', 'BigDecimal'],
  ['FLOAT', 'BigDecimal'],
  ['DOUBLE', 'BigDecimal'],
  ['REAL', 'BigDecimal'],
  ['MONEY', 'BigDecimal'],  // PostgreSQL

  // Boolean types - Wrapper types only
  ['BOOLEAN', 'Boolean'],
  ['BOOL', 'Boolean'],
  ['BIT', 'Boolean'],

  // Binary types
  ['BLOB', 'byte[]'],
  ['BYTEA', 'byte[]'],     // PostgreSQL
  ['BINARY', 'byte[]'],
  ['VARBINARY', 'byte[]'],
  ['RAW', 'byte[]'],       // Oracle
  ['LONG RAW', 'byte[]'],  // Oracle

  // JSON types
  ['JSON', 'String'],
  ['JSONB', 'String'],     // PostgreSQL

  // Date type (always LocalDate, not affected by dateTimeType config)
  ['DATE', 'LocalDate'],
]);

/**
 * Date/Time SQL types (mapped dynamically based on configuration)
 * Note: DATE is not included here - it always maps to LocalDate
 */
const DATE_TIME_SQL_TYPES = new Set([
  'DATETIME',
  'TIMESTAMP',
  'TIMESTAMP WITH TIME ZONE',
  'TIMESTAMP WITHOUT TIME ZONE',
  'TIMESTAMPTZ',  // PostgreSQL
]);

/**
 * Time-only SQL types
 */
const TIME_SQL_TYPES = new Set([
  'TIME',
  'TIME WITH TIME ZONE',
  'TIME WITHOUT TIME ZONE',
  'TIMETZ',  // PostgreSQL
]);

/**
 * Simple type name to fully qualified name mapping
 * Note: java.lang types return empty string (no import needed)
 */
const SIMPLE_TO_QUALIFIED_TYPE_MAP: Map<string, string> = new Map([
  // java.lang (no import needed - return empty string)
  ['String', ''],
  ['Integer', ''],
  ['Long', ''],
  ['Boolean', ''],
  ['Double', ''],
  ['Float', ''],
  ['Byte', ''],
  ['Short', ''],
  ['Character', ''],
  ['Object', ''],

  // java.math
  ['BigDecimal', 'java.math.BigDecimal'],
  ['BigInteger', 'java.math.BigInteger'],

  // java.time (Java 8+)
  ['LocalDate', 'java.time.LocalDate'],
  ['LocalTime', 'java.time.LocalTime'],
  ['LocalDateTime', 'java.time.LocalDateTime'],
  ['Instant', 'java.time.Instant'],
  ['ZonedDateTime', 'java.time.ZonedDateTime'],
  ['OffsetDateTime', 'java.time.OffsetDateTime'],
  ['Duration', 'java.time.Duration'],
  ['Period', 'java.time.Period'],

  // java.util
  ['Date', 'java.util.Date'],
  ['UUID', 'java.util.UUID'],

  // java.sql
  ['Timestamp', 'java.sql.Timestamp'],
  ['Time', 'java.sql.Time'],
  ['SqlDate', 'java.sql.Date'],
]);

/**
 * Convert snake_case to PascalCase
 * @param str - Input string in snake_case
 * @returns String in PascalCase
 * @example snakeToPascal('user_info') => 'UserInfo'
 */
export function snakeToPascal(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert snake_case to camelCase
 * @param str - Input string in snake_case
 * @returns String in camelCase
 * @example snakeToCamel('user_name') => 'userName'
 */
export function snakeToCamel(str: string): string {
  const pascal = snakeToPascal(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Map SQL type to Java type (wrapper types only)
 * @param sqlType - SQL type string (e.g., 'VARCHAR(50)', 'INT', 'BIGINT')
 * @param dateTimeType - Date/Time type preference (default: 'LocalDateTime')
 * @returns Java wrapper type string
 */
export function mapSqlTypeToJavaType(
  sqlType: SqlType,
  dateTimeType: DateTimeType = 'LocalDateTime',
  typeParams: string | undefined = undefined // TODO complete determine JavaType based on sqlType and typeParams, for example: TINYINT(1) should be Byte or Boolean, TINYINT(2) should be Integer, etc.
): string {
  // Check date/time types first (dynamic mapping based on configuration)
  if (DATE_TIME_SQL_TYPES.has(sqlType.toString())) {
    return dateTimeType;
  }

  // Check time-only types
  if (TIME_SQL_TYPES.has(sqlType)) {
    return 'LocalTime';
  }

  // Lookup in static mapping
  const javaType = SQL_TO_JAVA_TYPE_MAP.get(sqlType);
  if (javaType) {
    return javaType;
  }

  // Default fallback
  return 'String';
}

/**
 * Convert simple Java type name to fully qualified name
 * @param simpleType - Simple type name (e.g., 'LocalDateTime', 'BigDecimal', 'String')
 * @returns Fully qualified type name, or empty string for java.lang types (no import needed)
 * @example toFullyQualifiedType('LocalDateTime') => 'java.time.LocalDateTime'
 * @example toFullyQualifiedType('BigDecimal') => 'java.math.BigDecimal'
 * @example toFullyQualifiedType('String') => '' (java.lang types don't need import)
 */
export function toFullyQualifiedType(simpleType: string): string {
  // Handle array types
  if (simpleType.endsWith('[]')) {
    const baseType = simpleType.slice(0, -2);
    if (SIMPLE_TO_QUALIFIED_TYPE_MAP.has(baseType)) {
      const qualifiedBase = SIMPLE_TO_QUALIFIED_TYPE_MAP.get(baseType)!;
      // For java.lang types (empty string), return empty for array too
      return qualifiedBase ? `${qualifiedBase}[]` : '';
    }
    // For primitive arrays like byte[], return as-is
    return simpleType;
  }

  // Lookup in mapping (includes empty string for java.lang types)
  if (SIMPLE_TO_QUALIFIED_TYPE_MAP.has(simpleType)) {
    return SIMPLE_TO_QUALIFIED_TYPE_MAP.get(simpleType)!;
  }

  // If not found, assume it's already qualified or a custom type
  return simpleType;
}

/**
 * Check if a string is a valid SqlType
 * @param type - Normalized SQL type string
 * @returns true if the type is a valid SqlType
 */
function isValidSqlType(type: string): type is SqlType {
  const normalizedType = type.toUpperCase().trim();

  // Check all possible SqlType values
  const validTypes: SqlType[] = [
    'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT',
    'VARCHAR2', 'CLOB', 'NVARCHAR', 'NCHAR', 'NCLOB',
    'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER',
    'BIGINT', 'SERIAL', 'BIGSERIAL', 'NUMBER',
    'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL', 'MONEY',
    'BOOLEAN', 'BOOL', 'BIT',
    'BLOB', 'BYTEA', 'BINARY', 'VARBINARY', 'RAW', 'LONG RAW',
    'JSON', 'JSONB',
    'DATE',
    'DATETIME', 'TIMESTAMP', 'TIMESTAMP WITH TIME ZONE', 'TIMESTAMP WITHOUT TIME ZONE', 'TIMESTAMPTZ',
    'TIME', 'TIME WITH TIME ZONE', 'TIME WITHOUT TIME ZONE', 'TIMETZ',
  ];

  return validTypes.includes(normalizedType as SqlType);
}

/**
 * Normalize a SQL type string to its canonical SqlType form (removes length/precision and extra spaces).
 * @param sqlType - Original SQL type string, e.g. 'VARCHAR(255)', 'decimal(8,2)', 'TIMESTAMP WITHOUT TIME ZONE'
 * @returns Normalized SqlType (returns 'VARCHAR' if unknown)
 * @example normalizeSqlType('varchar') => 'VARCHAR'
 * @example normalizeSqlType('varchar(255)') => 'VARCHAR'
 * @example normalizeSqlType('decimal(10,2)') => 'DECIMAL'
 * @example normalizeSqlType('timestamp without time zone') => 'TIMESTAMP WITHOUT TIME ZONE'
 * @example normalizeSqlType('tinyint(1)') => 'TINYINT'
 */
export function normalizeSqlType(sqlType: string): SqlType {
  if (!sqlType) {
    return 'VARCHAR';
  }

  // Extract type name (may contain spaces, e.g. "timestamp without time zone"); remove parameter part.
  // Match all leading words and spaces, stop at parenthesis.
  const mainType = sqlType
    .trim()
    .toUpperCase()
    .replace(/^\s+|\s+$/g, '') // Trim leading/trailing whitespace
    .replace(/\(.+\)$/, '')    // Remove (xxx) parameters
    .replace(/\s+/, ' ');      // Normalize whitespace to single space

  // Handle multi-word types: try to find the longest valid type match
  const parts = mainType.split(/\s+/);
  for (let len = parts.length; len > 0; len--) {
    const candidate = parts.slice(0, len).join(' ');
    if (isValidSqlType(candidate)) {
      return candidate as SqlType;
    }
  }

  // Fallback if unrecognized: default to 'VARCHAR'
  return 'VARCHAR';
}

/**
 * Sort imports: java.* > javax.* > third-party > com.baomidou > lombok
 */
export function sortImports(imports: Set<string>): string[] {
  return Array.from(imports).sort((a, b) => {
    const getOrder = (imp: string): number => {
      if (imp.startsWith('java.')) { return 1; }
      if (imp.startsWith('javax.')) { return 2; }
      if (imp.startsWith('org.apache.ibatis') || imp.startsWith('org.mybatis')) { return 3; }
      if (imp.startsWith('com.baomidou.mybatisplus')) { return 4; }
      if (imp.startsWith('org.springframework')) { return 5; }
      if (imp.startsWith('io.swagger')) { return 6; }
      if (imp.startsWith('lombok')) { return 7; }
      return 8;
    };

    const orderA = getOrder(a);
    const orderB = getOrder(b);

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.localeCompare(b);
  });
}
