"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const clients_routes_1 = __importDefault(require("./modules/clients/clients.routes"));
const excel_routes_1 = __importDefault(require("./modules/excel/excel.routes"));
const templates_routes_1 = __importDefault(require("./modules/templates/templates.routes"));
const notices_routes_1 = __importDefault(require("./modules/notices/notices.routes"));
const gmail_routes_1 = __importDefault(require("./modules/gmail/gmail.routes"));
const app = (0, express_1.default)();
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
// API routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/clients", clients_routes_1.default);
app.use("/api/excel", excel_routes_1.default);
app.use("/api/templates", templates_routes_1.default);
app.use("/api/notices", notices_routes_1.default);
app.use("/api/gmail", gmail_routes_1.default);
// Health check
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        version: "2.1.0",
        templatesApi: true,
    });
});
// 404 Catch-all for API routes — always return JSON, never HTML
app.use("/api", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});
// Global error handler — never expose internals to client
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
