import { Router } from "express";
import { upsertAttendance, getMonthlyAttendance, getStaffCalendar, bulkMarkPresent, deleteAttendance } from "./attendance.controller";

const router = Router();

router.post("/", upsertAttendance);
router.get("/monthly", getMonthlyAttendance);
router.get("/calendar/:employeeId", getStaffCalendar);
router.post("/bulk", bulkMarkPresent);
router.delete("/", deleteAttendance);

export default router;
