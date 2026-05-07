import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Routes  import

import weatherRouter from "./routes/weather.routes.js";
import marketPriceRouter from "./routes/marketPrice.route.js";

// routes declaration
app.use("/api/v1/weather", weatherRouter);
app.use("/api/v1/prices", marketPriceRouter); //http://localhost:3232/api/v1/prices?state=West%20Bengal&commodity=Rice

export { app };
