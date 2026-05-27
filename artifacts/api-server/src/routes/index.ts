import { Router, type IRouter } from "express";
import healthRouter from "./health";
import businessesRouter from "./businesses";
import contentRouter from "./content";
import campaignsRouter from "./campaigns";
import analyticsRouter from "./analytics";
import seoRouter from "./seo";
import competitorsRouter from "./competitors";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(businessesRouter);
router.use(contentRouter);
router.use(campaignsRouter);
router.use(analyticsRouter);
router.use(seoRouter);
router.use(competitorsRouter);
router.use("/openai", openaiRouter);

export default router;
