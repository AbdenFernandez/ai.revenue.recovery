/**
 * RFC 4180 compliant CSV parser.
 * Handles quoted fields, escaped quotes (""), newlines within quotes, and variable line endings (CRLF, LF).
 */
export function parseCsv(csvText: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const normalized = csvText.replace(/^\uFEFF/, ""); // Strip UTF-8 BOM if present
  const matrix: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // Skip second quote
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentCell.trim());
        matrix.push(currentRow);
        currentRow = [];
        currentCell = "";
        i++; // Skip \n
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentCell.trim());
        matrix.push(currentRow);
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  // Push last cell/row if not empty
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    matrix.push(currentRow);
  }

  // Filter out completely empty rows
  const cleanMatrix = matrix.filter((row) =>
    row.some((cell) => cell.length > 0),
  );

  if (cleanMatrix.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = cleanMatrix[0] || [];
  const headers = rawHeaders.map((h) => h.trim());
  const dataRows = cleanMatrix.slice(1);

  const rows: Record<string, string>[] = dataRows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] !== undefined ? row[index] : "";
    });
    return record;
  });

  return { headers, rows };
}

/**
 * Converts records into an RFC 4180 CSV string for export.
 */
export function formatCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const headerLine = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const dataLines = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val === null || val === undefined) return "";
        return escapeCsvCell(String(val));
      })
      .join(","),
  );

  return [headerLine, ...dataLines].join("\r\n");
}

function escapeCsvCell(cell: string): string {
  if (
    cell.includes(",") ||
    cell.includes('"') ||
    cell.includes("\n") ||
    cell.includes("\r")
  ) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
