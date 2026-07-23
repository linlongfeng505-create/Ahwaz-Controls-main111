import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import storageRouter from "./storage";
import settingsRouter from "./settings";
import submissionsRouter from "./submissions";
import articlesRouter from "./articles";
import sitemapRouter from "./sitemap";
import visitRouter from "./visit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(storageRouter);
router.use(settingsRouter);
router.use(submissionsRouter);
router.use(articlesRouter);
router.use(sitemapRouter);
router.use(visitRouter);

export default router;
