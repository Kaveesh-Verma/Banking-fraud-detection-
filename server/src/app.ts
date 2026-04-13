import express from "express";
import cors from "cors";
import router from "./routes/index.js";

const app = express();

app.set("trust proxy", true);
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
