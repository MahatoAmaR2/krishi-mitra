import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Routes  import

import weatherRouter from "./routes/weatherRoutes.js";

// routes declaration
app.use("/api/v1/weather", weatherRouter);

export { app };