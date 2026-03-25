//api to check if user is admin
import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
const isAdmin = async (req, res) => {
  try {
    const { userId } = req.auth();
    console.log("🚀 ~ isAdmin ~ userId:", userId)
    
    if (!userId) {
      return res.json({ success: true, isAdmin: false });
    }

    const user = await clerkClient.users.getUser(userId);
    const isAdmin = user.privateMetadata.role === "admin";
    
    res.json({ success: true, isAdmin });
  } catch (error) {
    console.error(error);
    res.json({ success: true, isAdmin: false });
  }
};

// api to get dashboard data
const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });
    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    }).populate("movie");
    const totalUser = await User.countDocuments();
    const dashboardData = {
      totalBooking: bookings.length,
      totalRevenue: bookings.reduce(
        (acc, boooking) => acc + boooking.amount,
        0,
      ),
      activeShows,
      totalUser,
    };
    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
// api to get all shows
const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });
    res.json({ success: true, shows });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//api to get all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate('user').populate({
      path : "show",
      populate : {
        path : "movie"
      }
    }).sort({cretedAt:-1})
    res.json({success:true,bookings})
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export { isAdmin, getDashboardData,getAllBookings,getAllShows }
