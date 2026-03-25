import express from "express";

const bookingRouter = express.Router();
import { createBooking,getOccuipedSeats } from "../controller/bookingController.js";

bookingRouter.post("/create",createBooking);
bookingRouter.get("/Seats/:showId", getOccuipedSeats);
export default bookingRouter;