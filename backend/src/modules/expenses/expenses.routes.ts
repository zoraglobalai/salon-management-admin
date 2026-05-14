import { Router } from "express";
import { requireAuth } from "../../middleware/authMiddleware";
import { getExpenses, postExpense } from "./expenses.controller";

const expensesRouter = Router();

expensesRouter.get("/", requireAuth, getExpenses);
expensesRouter.post("/", requireAuth, postExpense);

export { expensesRouter };
