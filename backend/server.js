import dotenv from "dotenv";
import { app } from "./src/app.js";
import dns from "node:dns"
import connectDB from "./src/config/connectDB.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config({
  path: "./.env",
});



const PORT = process.env.PORT || 3232;

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });
