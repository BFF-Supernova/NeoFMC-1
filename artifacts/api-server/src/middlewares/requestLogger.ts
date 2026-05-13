import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../lib/logger";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level](`${req.method} ${req.path} ${res.statusCode}`, {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      tenantId: req.user?.tenantId || undefined,
      userId: req.user?.id || undefined,
    });
  });

  next();
}
