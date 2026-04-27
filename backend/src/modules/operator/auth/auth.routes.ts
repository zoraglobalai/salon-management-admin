import { Router } from "express";
import { login, me } from "./auth.controller";
import { requireAuth } from "../../../middleware/authMiddleware";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", requireAuth, me);

export { authRouter };
