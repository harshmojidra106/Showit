import { Inngest } from "inngest";
import User from "../models/User.js";

export const inngest = new Inngest({ id: "movie-ticket-booking" });

const SyncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event, step }) => {
    try {
      console.log("User creation event received:", event.data);
      
      const { id, first_name, last_name, email_addresses, image_url } = event.data;
      
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
      const { id, first_name, last_name, email_addresses, image_url } = event.data;
      
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

export const functions = [SyncUserCreation, syncUserDeletion, syncUserUpdation];
