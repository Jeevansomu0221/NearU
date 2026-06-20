import { Router, Request, Response } from "express";

const router = Router();

const OFFICIAL_SITE_URL =
  process.env.VYAHA_OFFICIAL_URL?.trim().replace(/\/$/, "") ||
  "https://www.vyaha.com";

const redirectToOfficial = (path: string) => (_req: Request, res: Response) => {
  res.redirect(301, `${OFFICIAL_SITE_URL}${path}`);
};

router.get("/privacy", redirectToOfficial("/privacy"));
router.get("/terms", redirectToOfficial("/terms"));
router.get("/delete-account", redirectToOfficial("/delete-account"));

export default router;
