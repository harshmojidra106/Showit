import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendemail from "../config/nodemailer.js";
import { messageInRaw } from "svix";

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
    const userName = booking.user.name?.replace("null", "").trim();
    await sendemail({
      to: booking.user.email,
      subject: `Payment Confirmation:"${booking.show.movie.title}"booked!`,
      body: `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      
      <h2>Hi ${userName},</h2>
      
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

// send a reminder to user
const sendShowReminder = inngest.createFunction(
  { id: " send-show-reminders" },
  { cron: "0 */8 * * *" }, //every 8 hours excute
  async ({ step }) => {
    const now = new Date();
    const in8hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8hours.getTime() - 10 * 60 * 1000);

    //prepare reminder task
    const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
      const shows = await Show.find({
        showTime: { $gte: windowStart, $lte: in8hours },
      }).populate("movie");

      const tasks = [];
      for (const show of shows) {
        if (!show.movie || !show.occupiedSeats) continue;

        const userIds = [...new set(Object.values(show.occupiedSeats))];

        if (userIds.length === 0) continue;

        const users = await User.find({ _id: { $in: userIds } }).select(
          "name email",
        );

        for (const user of users) {
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          });
        }
      }
      return tasks;
    });

    if (reminderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send " };
    }

    //send reminder email
    const result = await setp.run("send-all-reminders", async () => {
      return await Promise.allSettled(
        reminderTasks.map((task) =>
          sendemail({
            to: task.UserEmail,
            subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
            body: `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Hello ${task.userName},</h2>

  <p>This is a quick reminder that your movie:</p>

  <h3 style="color: #F84565;">"${task.movieTitle}"</h3>

  <p>
    is scheduled for 
    <strong>
      ${new Date(task.showTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}
    </strong> 
    at 
    <strong>
      ${new Date(task.showTime).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
    </strong>.
  </p>

  <p>
    It starts in approximately <strong>8 hours</strong> - make sure you're ready!
  </p>

  <br/>

      <p>
    Enjoy the show!<br/>
    QuickShow Team
     </p>
   </div>
   `,
          }),
        ),
      );
    });
    const sent = result.filter((r) => r.status === "fulfilled").length;
    const failed = result.length - sent;

    return {
      sent,
      failed,
      message: `Sent ${sent} reminders(s),${failed} failed `,
    };
  },
);

const sendNewShowNotifications = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle } = event.data;
    const users = await User.find({});

    for (const user of users) {
      const userEmail = user.email;
      const userName = user.name;
      const subject = ` New Show Added: ${movieTitle}`;
      const body = `
         <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Hi ${userName},</h2>
                <p>We've just added a new show to our library:</p>
             <h3 style="color: #F84565;">"${movieTitle}"</h3>
                  <p>Visit our website</p>
                 <br/>
                   <p>Thanks,<br/>QuickShow Team</p>
                      </div>`;
      await sendemail({ to: userEmail, subject, body });
    }
    return { message: "Notifications sent." };
  },
);

export const functions = [
  SyncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminder,
  sendNewShowNotifications,
];
