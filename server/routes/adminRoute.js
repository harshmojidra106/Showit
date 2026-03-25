import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import { getAllBookings, getAllShows, getDashboardData, isAdmin } from "../controller/adminController.js";
const adminRouter = express.Router();

adminRouter.get('/is-Admin', isAdmin)
adminRouter.get('/dashboard', protectAdmin,getDashboardData)
adminRouter.get('/all-shows', protectAdmin,getAllShows)
adminRouter.get('/all-bookings', protectAdmin,getAllBookings)

export default adminRouter;