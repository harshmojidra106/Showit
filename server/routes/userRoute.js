
import express from "express"
const userRouter = express.Router()
import {getUserBookings, updateFavorite, getFavorites } from "../controller/userController.js"

userRouter.get("/bookings", getUserBookings)
userRouter.post("/update-favorite", updateFavorite)
userRouter.get("/favorite", getFavorites)

export default userRouter;