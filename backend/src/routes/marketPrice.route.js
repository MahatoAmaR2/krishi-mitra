import express from "express";

const router = express.Router();

import { getMarketPrices } from "../controllers/marketPrice.js";

router.get("/", getMarketPrices);

export default router;