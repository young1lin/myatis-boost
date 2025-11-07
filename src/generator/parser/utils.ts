/**
 * Utility functions for DDL parsing
 */

import { DateTimeType } from '../type';

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
 */
const SIMPLE_TO_QUALIFIED_TYPE_MAP: Map<string, string> = new Map([
  // java.lang (implicitly imported, but can be explicit)
  ['String', 'java.lang.String'],
  ['Integer', 'java.lang.Integer'],
  ['Long', 'java.lang.Long'],
  ['Boolean', 'java.lang.Boolean'],
  ['Double', 'java.lang.Double'],
  ['Float', 'java.lang.Float'],
  ['Byte', 'java.lang.Byte'],
  ['Short', 'java.lang.Short'],
  ['Character', 'java.lang.Character'],
  ['Object', 'java.lang.Object'],

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
  sqlType: string,
  dateTimeType: DateTimeType = 'LocalDateTime'
): string {
  const normalizedType = sqlType.toUpperCase().replace(/\(.*\)/, '').trim();

  // Check date/time types first (dynamic mapping based on configuration)
  if (DATE_TIME_SQL_TYPES.has(normalizedType)) {
    return dateTimeType;
  }

  // Check time-only types
  if (TIME_SQL_TYPES.has(normalizedType)) {
    return 'LocalTime';
  }

  // Lookup in static mapping
  const javaType = SQL_TO_JAVA_TYPE_MAP.get(normalizedType);
  if (javaType) {
    return javaType;
  }

  // Default fallback
  return 'String';
}

/**
 * Convert simple Java type name to fully qualified name
 * @param simpleType - Simple type name (e.g., 'LocalDateTime', 'BigDecimal')
 * @returns Fully qualified type name (e.g., 'java.time.LocalDateTime', 'java.math.BigDecimal')
 * @example toFullyQualifiedType('LocalDateTime') => 'java.time.LocalDateTime'
 */
export function toFullyQualifiedType(simpleType: string): string {
  // Handle array types
  if (simpleType.endsWith('[]')) {
    const baseType = simpleType.slice(0, -2);
    const qualifiedBase = SIMPLE_TO_QUALIFIED_TYPE_MAP.get(baseType);
    if (qualifiedBase) {
      return `${qualifiedBase}[]`;
    }
    // For primitive arrays like byte[], return as-is
    return simpleType;
  }

  // Lookup in mapping
  const qualifiedType = SIMPLE_TO_QUALIFIED_TYPE_MAP.get(simpleType);
  if (qualifiedType) {
    return qualifiedType;
  }

  // If not found, assume it's already qualified or a custom type
  return simpleType;
}

/**
 * Normalize SQL type string (extract base type without length/precision)
 * @param sqlType - Raw SQL type from DDL
 * @returns Normalized type string
 * @example normalizeSqlType('VARCHAR(255)') => 'VARCHAR'
 */
export function normalizeSqlType(sqlType: string): string {
  return sqlType.replace(/\(.*\)/, '').trim().toUpperCase();
}
