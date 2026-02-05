import { Inngest } from "inngest";
import User from "../models/User.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

const SyncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/users.created" },
  async ({ event, step }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;
    const UserData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.create(UserData);
  },
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/users.deleted" }, // Fixed: added 's'
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  },
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/users.updated" }, // Fixed: added 's'
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } = event.data;
    const UserData = {
      email: email_addresses[0].email_address, // Fixed: removed extra 's'
      name: first_name + " " + last_name, // Fixed: added space
      image: image_url,
    };
    await User.findByIdAndUpdate(id, UserData, { new: true });
  },
);

export const functions = [SyncUserCreation, syncUserDeletion, syncUserUpdation];
