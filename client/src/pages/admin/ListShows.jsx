import { useEffect, useState } from "react";
import React from "react";
import Title from "../../components/admin/Title";
import { DateFormat } from "../../lib/DateFormat";
import { useAppContext } from "../../context/AppContext";
import Loading from "../../components/Loading";

const ListShows = () => {
  const currency = import.meta.env.VITE_CURRENCY;
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { axios, getToken, user } = useAppContext();

  const getAllShows = async () => {
    try {
      const { data } = await axios.get("/api/admin/all-shows", {
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
  
      setShows(data.shows);
     
    
      setLoading(false);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (user) {
      getAllShows();
    }
  }, [user]);

  return !loading ? (
    <>
      <Title text1="List" text2="Shows" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium">Movie Name</th>
              <th className="p-2 font-medium">Show Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {shows.map((show, index) => (
              <tr className="border-b border-primary/10 bg-primary/5 even:bg-primary/10 ">
                <td className="p-2 min-w-45 pl-5">{show.movie.title}</td>
                <td className="p-2 ">{DateFormat(show.showDateTime)}</td>
                <td className="p-2">
                  {Object.keys(show.occupiedSeats).length}{" "}
                </td>
                <td className="p-2">
                  {currency}{" "}
                  {Object.keys(show.occupiedSeats).length * show.showPrice}{" "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListShows;
