"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUIRED_COLUMNS = void 0;
exports.validateExcelColumns = validateExcelColumns;
exports.REQUIRED_COLUMNS = [
    "NAME",
    "BOUNCE AMOUNT",
    "BOUNCE DATE",
    "EMAIL ID",
    "MOBILE NO",
];
function validateExcelColumns(columns) {
    const missing = exports.REQUIRED_COLUMNS.filter((column) => !columns.includes(column));
    return {
        valid: missing.length === 0,
        missing,
    };
}
