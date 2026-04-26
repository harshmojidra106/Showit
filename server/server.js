import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/db.js";
import { clerkAuth } from "./middleware/auth.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./ingest/index.js";
import showRouter from "./routes/showRoute.js";
import bookingRouter from "./routes/bookingRoute.js";
import adminRouter from "./routes/adminRoute.js";
import userRouter from "./routes/userRoute.js";
import { stripeWebhooks } from "./controller/stripeWebhooks.js";

const app = express();
const port = process.env.PORT;

app.use(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhooks,
);

app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(clerkAuth);

await connectDB();

app.get("/", (req, res) => {
  res.json({ message: "Hello World" });
});
app.use("/api/ingest", serve({ client: inngest, functions }));
app.use("/api/show", showRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);

app.listen(port, () => console.log(`Server running on port ${port}`));
