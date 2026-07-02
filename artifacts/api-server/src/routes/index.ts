import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import dashboardRouter from "./dashboard.js";
import patientsRouter from "./patients.js";
import appointmentsRouter from "./appointments.js";
import financialRouter from "./financial.js";
import servicesRouter from "./services.js";
import inventoryRouter from "./inventory.js";
import analyticsRouter from "./analytics.js";
import templatesRouter from "./templates.js";
import usersRouter from "./users.js";
import settingsRouter from "./settings.js";
import staffRouter from "./staff.js";
import tasksRouter from "./tasks.js";
import supabaseProxyRouter from "./supabase-proxy.js";
import uploadRouter from "./upload.js";
import authRouter, { authMiddleware } from "./auth.js";

const router: IRouter = Router();

router.use(authRouter);
router.use(authMiddleware);

router.use(healthRouter);
router.use(dashboardRouter);
router.use(patientsRouter);
router.use(appointmentsRouter);
router.use(financialRouter);
router.use(servicesRouter);
router.use(inventoryRouter);
router.use(analyticsRouter);
router.use(templatesRouter);
router.use(usersRouter);
router.use(settingsRouter);
router.use(staffRouter);
router.use(tasksRouter);
router.use(supabaseProxyRouter);
router.use(uploadRouter);

export default router;
