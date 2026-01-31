import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import { serve } from "inngest/express";
import {inngest,functions} from "./ingest/index.js"

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

await connectDB();

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});
app.use("/api/ingest", serve({ client: inngest, functions }));

app.listen(port, () => console.log(`Server running on port ${port}`));
