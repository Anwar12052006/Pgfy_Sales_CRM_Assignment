/**
 * RFC 4180 Compliant CSV Serializer with Spreadsheet Formula Injection Defense
 * and UTF-8 Byte Order Mark (BOM) for Microsoft Excel compatibility.
 */

export interface CSVColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | Date | null | undefined;
}

const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Format currency numbers in Indian Rupee format (en-IN)
 */
export function formatINR(amount: number | string | { toString(): string } | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  return `₹${Number(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

/**
 * Sanitize a field to prevent Spreadsheet Formula Injection (CSV Injection / DDE).
 * If the value starts with =, +, -, @, tab, or carriage return, prepend a single quote (').
 */
export function sanitizeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Native numbers are safe from formula execution
  if (typeof value === 'number') {
    return isNaN(value) ? '' : String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else {
    str = String(value);
  }

  // Formula injection check on string inputs: if first char is a formula trigger, neutralize with leading single quote
  if (str.length > 0 && FORMULA_TRIGGERS.includes(str.charAt(0))) {
    str = `'${str}`;
  }

  // RFC 4180 escaping: If string contains double-quote, comma, or newline, escape internal quotes by doubling them and enclose in quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate a complete RFC 4180 CSV string with UTF-8 BOM
 */
export function generateCSV<T>(columns: CSVColumn<T>[], rows: T[]): string {
  // UTF-8 Byte Order Mark (BOM) ensures Excel opens the CSV in UTF-8 without garbling special symbols like ₹
  const BOM = '\uFEFF';
  const headerLine = columns.map((col) => sanitizeCSVValue(col.header)).join(',');

  if (rows.length === 0) {
    return `${BOM}${headerLine}\r\n`;
  }

  const rowLines = rows.map((row) =>
    columns.map((col) => sanitizeCSVValue(col.accessor(row))).join(',')
  );

  return `${BOM}${headerLine}\r\n${rowLines.join('\r\n')}\r\n`;
}
