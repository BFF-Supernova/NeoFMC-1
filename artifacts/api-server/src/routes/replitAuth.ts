import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
  type ReplitSessionUser,
} from "../lib/replitAuth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

router.get("/auth/user", (req: Request, res: Response) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.fullName,
        lastName: null,
        profileImageUrl: null,
      },
    });
  } else {
    res.json({ user: null });
  }
});

router.get("/login", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;

    const returnTo = getSafeReturnTo(req.query.returnTo);

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    setOidcCookie(res, "code_verifier", codeVerifier);
    setOidcCookie(res, "nonce", nonce);
    setOidcCookie(res, "state", state);
    setOidcCookie(res, "return_to", returnTo);

    res.redirect(redirectTo.href);
  } catch (err) {
    console.error("OIDC login error:", err);
    res.status(500).json({ error: "Login initialization failed" });
  }
});

router.get("/callback", async (req: Request, res: Response) => {
  try {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const emailVerified = claims.email_verified === true || claims.email_verified === "true";
  const replitEmail = emailVerified ? (claims.email as string | undefined) : undefined;

  const sessionUser: ReplitSessionUser = {
    id: claims.sub as string,
    email: replitEmail || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };

  if (replitEmail) {
    try {
      const [neoUser] = await db.select().from(usersTable)
        .where(eq(usersTable.email, replitEmail)).limit(1);
      if (neoUser && neoUser.isActive) {
        let domainAllowed = true;
        if (neoUser.tenantId) {
          const [tenant] = await db.select({ allowedDomains: tenantsTable.allowedDomains }).from(tenantsTable).where(eq(tenantsTable.id, neoUser.tenantId)).limit(1);
          if (tenant?.allowedDomains) {
            const domains = tenant.allowedDomains.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
            if (domains.length > 0) {
              const emailDomain = replitEmail.split('@')[1]?.toLowerCase();
              if (!emailDomain || !domains.includes(emailDomain)) {
                domainAllowed = false;
              }
            }
          }
        }
        if (domainAllowed) {
          const PRIVILEGED_ROLES = ["SuperAdmin", "TenantAdmin", "BranchManager", "FinancialController", "CFO"];
          if (PRIVILEGED_ROLES.includes(neoUser.role) && !neoUser.totpEnabled) {
            console.warn(`OIDC login blocked for privileged user ${replitEmail} — MFA not enabled`);
            res.redirect("/?error=mfa_required");
            return;
          }
          sessionUser.neoUserId = neoUser.id;
          sessionUser.tenantId = neoUser.tenantId;
          sessionUser.role = neoUser.role;
          sessionUser.fullName = neoUser.fullName;
        }
      }
    } catch (err) {
      console.error("Error looking up Neo FMC user by email:", err);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: sessionUser,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
  } catch (err) {
    console.error("OIDC callback error:", err);
    res.redirect("/login");
  }
});

router.get("/logout", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const origin = getOrigin(req);

    const sid = getSessionId(req);
    await clearSession(res, sid);

    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID!,
      post_logout_redirect_uri: origin,
    });

    res.redirect(endSessionUrl.href);
  } catch (err) {
    console.error("OIDC logout error:", err);
    res.redirect("/login");
  }
});

export default router;
