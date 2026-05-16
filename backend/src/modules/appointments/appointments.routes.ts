import { Router } from "express";
import * as controller from "./appointments.controller";

const router = Router();

router.post("/", controller.createAppointment);
router.get("/daily", controller.getDailyAppointments);
router.get("/calendar", controller.getCalendarAppointments);
router.put("/:id", controller.updateAppointment);
router.put("/:id/status", controller.updateAppointmentStatus);
router.delete("/:id", controller.deleteAppointment);

router.get("/holidays", controller.listHolidays);
router.post("/holidays", controller.createHoliday);
router.delete("/holidays/:id", controller.deleteHoliday);

router.get("/busy-slots", controller.getBusySlots);
router.get("/attendance-status", controller.getStaffAttendanceStatus);
router.post("/auto-expire", controller.triggerAutoExpire);

export default router;
