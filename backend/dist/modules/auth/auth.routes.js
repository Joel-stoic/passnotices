"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_validation_1 = require("./auth.validation");
const auth_service_1 = require("./auth.service");
const router = (0, express_1.Router)();
router.post("/signup", async (req, res) => {
    const parsed = auth_validation_1.signupSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
        const { token, user, tenant } = await (0, auth_service_1.signup)(parsed.data);
        res.status(201).json({
            token,
            user: { id: user.id, email: user.email, role: user.role },
            tenant: { id: tenant.id, name: tenant.name },
        });
    }
    catch (err) {
        res.status(400).json({ error: err.message || "Signup failed" });
    }
});
router.post("/login", async (req, res) => {
    const parsed = auth_validation_1.loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    try {
        const { token, user } = await (0, auth_service_1.login)(parsed.data);
        res.json({
            token,
            user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
        });
    }
    catch (err) {
        // Never expose internal errors to client
        const safeMessages = ["Invalid email or password", "Email already registered"];
        const message = safeMessages.includes(err.message)
            ? err.message
            : "Something went wrong. Please try again.";
        res.status(401).json({ error: message });
    }
});
exports.default = router;
