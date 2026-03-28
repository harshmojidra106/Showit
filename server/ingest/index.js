import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendemail from "../config/nodemailer.js";

export const inngest = new Inngest({
  id: "movie-ticket-booking",
  eventKey: process.env.INGEST_EVENT_KEY,
});

const SyncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event, step }) => {
    try {
      console.log("User creation event received:", event.data);

      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      const UserData = {
        _id: id,
        email: email_addresses[0].email_address,
        name: `${first_name} ${last_name}`,
        image: image_url,
      };

      console.log("Creating user with data:", UserData);
      const newUser = await User.create(UserData);
      console.log("User created successfully:", newUser);

      return { success: true, userId: id };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    try {
      const { id } = event.data;
      console.log("Deleting user:", id);
      await User.findByIdAndDelete(id);
      console.log("User deleted successfully");
      return { success: true };
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      const UserData = {
        email: email_addresses[0].email_address,
        name: `${first_name} ${last_name}`,
        image: image_url,
      };

      console.log("Updating user:", id, UserData);
      await User.findByIdAndUpdate(id, UserData, { new: true });
      console.log("User updated successfully");
      return { success: true };
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },
);

//ingest function to cancel  booking and release seats of show after 10 minutes  of booking created if payment is not made

const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

      //if payment is not made, release seats and delete booking
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });
        show.markModified("occupiedSeats");
        await show.save();
        await Booking.findByIdAndDelete(booking._id);
      }
    });
  },
);

//inngest function to send email after successful booking

const sendBookingConfirmationEmail = inngest.createFunction(
  {
    id: "send-confirmation-email",
  },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const bookingId = event.data.bookingId;
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      })
      .populate("user");
    await sendemail({
      to: booking.user.email,
      subject: `Payment Confirmation:"${booking.show.movie.title}"booked!`,
      body: `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      
      <h2>Hi ${booking.user.name},</h2>
      
      <p>
        Your booking for 
        <strong style="color: #F84565;">
          ${booking.show.movie.title}
        </strong> 
        is confirmed.
      </p>
      
      <p>
        <strong>Date:</strong> 
        ${new Date(booking.show.showDateTime).toLocaleDateString("en-US", {
          timeZone: "Asia/Kolkata",
        })}
        <br/>
        
        <strong>Time:</strong> 
        ${new Date(booking.show.showDateTime).toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
        })}
      </p>
      
      <p>Enjoy the show! 🍿</p>
      
      <p>
        Thanks for booking with us!<br/>
        — QuickShow Team
      </p>
      
    </div>
  `,
    });
  },
);

export const functions = [
  SyncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail
];
