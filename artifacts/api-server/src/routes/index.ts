import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import storageRouter from "./storage";
import settingsRouter from "./settings";
import submissionsRouter from "./submissions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(storageRouter);
router.use(settingsRouter);
router.use(submissionsRouter);

export default router;
