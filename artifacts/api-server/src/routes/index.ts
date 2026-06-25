import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import patientsRouter from "./patients";
import appointmentsRouter from "./appointments";
import financialRouter from "./financial";
import servicesRouter from "./services";
import inventoryRouter from "./inventory";
import analyticsRouter from "./analytics";
import templatesRouter from "./templates";
import usersRouter from "./users";
import settingsRouter from "./settings";

const router: IRouter = Router();

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

export default router;
