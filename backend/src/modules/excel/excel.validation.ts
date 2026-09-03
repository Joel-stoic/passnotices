export const REQUIRED_COLUMNS = [
  "NAME",
  "BOUNCE AMOUNT",
  "BOUNCE DATE",
  "EMAIL ID",
  "MOBILE NO",
];

export function validateExcelColumns(columns: string[]) {
  const missing = REQUIRED_COLUMNS.filter(
    (column) => !columns.includes(column)
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}