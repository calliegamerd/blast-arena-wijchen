import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contactRouter from "./contact";
import slotsRouter from "./slots";
import adminRouter from "./admin";
import subscribersRouter from "./subscribers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(contactRouter);
router.use(slotsRouter);
router.use(adminRouter);
router.use(subscribersRouter);

export default router;
