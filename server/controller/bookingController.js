import Show from "../models/Show.js";
import Booking from "../models/Booking.js";
import stripe from "stripe";
import { inngest } from "../ingest/index.js";
// function to check availabilty of selected seats for movie

const checkSeatsAvilablity = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) {
      return false;
    }
    const occupiedSeats = showData.occupiedSeats;

    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);

    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};
// for booking a movie ticket
const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats } = req.body;
    //front end url is origin
    const { origin } = req.headers;

    //check if the seat is avilable or not
    const isAvailable = await checkSeatsAvilablity(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({ success: false, message: "seats are not available" });
    }
    //get the show details if the seat is avilable
    const showData = await Show.findById(showId).populate("movie");

    //create a new booking data
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: selectedSeats.length * showData.showPrice,
      bookedSeats: selectedSeats,
    });
    selectedSeats.map((seat) => {
      showData.occupiedSeats[seat] = userId;
    });

    showData.markModified("occupiedSeats");

    await showData.save();

    //stripe gateway letter
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

    //creating line items for stripe
    const line_items = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: showData.movie.title,
          },
          unit_amount: Math.floor(booking.amount) * 100,
        },
        quantity: 1,
      }
    ];
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, //expires in 30 min
    });

    booking.paymentLink = session.url;
    await booking.save();

    //run inngest sheduler function to check payment after 10 minutes
    await inngest.send({
      name:"app/checkpayment",
      data:{
        bookingId: booking._id.toString()
      }
    })

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
// for getting occupied seat data

const getOccuipedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showdata = await Show.findById(showId);
    const occupiedSeats = Object.keys(showdata.occupiedSeats);
    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

export { createBooking, getOccuipedSeats };
