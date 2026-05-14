import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { replitAuthMiddleware } from "./middlewares/replitAuthMiddleware";
import { tenantRlsMiddleware } from "./middlewares/tenantRls";
import { apiRateLimiter, authRateLimiter, webhookRateLimiter } from "./middlewares/rateLimiter";
import { sessionTimeoutMiddleware } from "./middlewares/sessionSecurity";
import { securityHeadersMiddleware, tenantRateLimiterMiddleware } from "./middlewares/securityHeaders";
import { requestLoggerMiddleware } from "./middlewares/requestLogger";
import { verifyToken } from "./lib/auth";
import router from "./routes";
import { initScheduler } from "./lib/scheduler";

const app: Express = express();

app.use(securityHeadersMiddleware);
app.use(requestLoggerMiddleware);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : undefined;
app.use(cors({
  credentials: true,
  origin: allowedOrigins || true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));


app.use("/api/auth/login", authRateLimiter);
app.use("/api/epayments/webhook", webhookRateLimiter);
app.use("/api", apiRateLimiter);

app.use(replitAuthMiddleware);

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const user = verifyToken(authHeader.slice(7));
      if (user) req.user = user;
    }
  }
  next();
});

app.use(sessionTimeoutMiddleware);
app.use(tenantRlsMiddleware);
app.use(tenantRateLimiterMiddleware());

app.use("/api", router);

initScheduler();

export default app;
