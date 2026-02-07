import { Router } from "express";
import { randomUUID } from "crypto";
import { storage } from "../../storage";
import { requireAuth, getUserIdFromRequest, USER_ID_COOKIE_NAME, AuthenticatedRequest } from "../../middleware/auth";

export const identityRoutes = Router();

// ==================== AUTH ====================
// Minimal local auth endpoints (no external provider)
identityRoutes.get("/api/login", async (_req, res) => {
  const userId = randomUUID();
  res.setHeader(
    "Set-Cookie",
    // `Secure` is intentionally omitted for local HTTP dev; add it when you enforce HTTPS.
    `${USER_ID_COOKIE_NAME}=${encodeURIComponent(userId)}; Path=/; HttpOnly; SameSite=Lax`,
  );
  res.redirect("/");
});

identityRoutes.get("/api/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${USER_ID_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  res.redirect("/");
});

identityRoutes.get("/api/auth/user", requireAuth, async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req)!;
    let user = await storage.getUser(userId);
    if (!user) {
      user = await storage.upsertUser({ id: userId });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});
