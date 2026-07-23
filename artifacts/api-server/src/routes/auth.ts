import { Router, Request, Response, NextFunction } from "express";

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// In-memory store for rate limiting IP addresses
// Key: IP address
// Value: { attempts: number, lockUntil: number }
const loginAttempts = new Map<string, { attempts: number; lockUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): string | null {
  const record = loginAttempts.get(ip);
  if (record && record.lockUntil > Date.now()) {
    const remainingMinutes = Math.ceil((record.lockUntil - Date.now()) / 60000);
    return `Too many failed attempts. Please try again after ${remainingMinutes} minutes.`;
  }
  return null;
}

function recordAttempt(ip: string, success: boolean): { error?: string; remaining?: number } {
  if (success) {
    loginAttempts.delete(ip);
    return {};
  }
  
  const record = loginAttempts.get(ip);
  const currentAttempts = record ? record.attempts + 1 : 1;
  let newLockUntil = 0;
  
  if (currentAttempts >= MAX_ATTEMPTS) {
    newLockUntil = Date.now() + LOCK_TIME_MS;
  }

  loginAttempts.set(ip, { attempts: currentAttempts, lockUntil: newLockUntil });

  if (currentAttempts >= MAX_ATTEMPTS) {
    return { error: "Too many failed attempts. Please try again after 15 minutes." };
  }
  return { error: "Incorrect password", remaining: MAX_ATTEMPTS - currentAttempts };
}

router.post("/auth/login", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  const blockError = checkRateLimit(ip);
  if (blockError) {
    res.status(429).json({ error: blockError });
    return;
  }

  const { password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    const result = recordAttempt(ip, false);
    res.status(result.remaining === undefined ? 429 : 401).json({ 
      error: result.remaining !== undefined ? `Incorrect password. ${result.remaining} attempts remaining.` : result.error 
    });
    return;
  }

  recordAttempt(ip, true);
  res.json({ success: true });
});

// Centralized requireAdmin middleware that also applies rate-limiting
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  const blockError = checkRateLimit(ip);
  if (blockError) {
    res.status(429).json({ error: blockError });
    return;
  }

  const auth = req.headers["x-admin-password"];
  if (auth !== ADMIN_PASSWORD) {
    const result = recordAttempt(ip, false);
    res.status(result.remaining === undefined ? 429 : 401).json({ error: "Unauthorized" });
    return;
  }
  
  recordAttempt(ip, true);
  next();
}

export default router;
