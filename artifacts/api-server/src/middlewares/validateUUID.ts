import { Request, Response, NextFunction } from "express";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(...paramNames: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (value && !UUID_RE.test(value)) {
        res.status(400).json({ error: "invalid_parameter", message: `Parameter '${name}' must be a valid UUID` });
        return;
      }
    }
    next();
  };
}
