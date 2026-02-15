/**
 * Helper functions for data processing.
 */

export function isValidDate(value) {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime()) && 
         (value.includes('-') || value.includes('/'));
}

export function guessSqlType(value) {
  if (value === null || value === undefined) return 'TEXT';
  if (typeof value === 'string' && isValidDate(value)) return 'TIMESTAMP';
  if (!isNaN(value) && value.toString().includes('.')) return 'NUMERIC';
  if (!isNaN(value)) {
    const num = Number(value);
    if (num > 2147483647 || num < -2147483648) return 'BIGINT';
    return 'INTEGER';
  }
  return 'TEXT';
}

export function normalizeColumnName(column) {
  const reservedKeywords = ['user', 'group', 'order', 'select', 'where', 'from', 'table', 'column'];
  
  let normalized = column.trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    
  if (reservedKeywords.includes(normalized.toLowerCase())) {
    normalized += '1';
  }
  
  return normalized;
}
