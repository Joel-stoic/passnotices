import { Router } from "express";
import { signupSchema, loginSchema } from "./auth.validation";
import { signup, login } from "./auth.service";

const router = Router();

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { token, user, tenant } = await signup(parsed.data);
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
      tenant: { id: tenant.id, name: tenant.name },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const { token, user } = await login(parsed.data);
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Login failed" });
  }
});

export default router;