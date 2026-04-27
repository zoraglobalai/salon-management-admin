import type { NextFunction, Request, Response } from "express";
import { loginUser } from "./auth.service";

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const session = await loginUser(email, password);

    if (!session) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json(session);
  } catch (error) {
    return next(error);
  }
}

export async function me(req: Request, res: Response) {
  return res.json({ user: req.user });
}
