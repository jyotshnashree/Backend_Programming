import { useEffect, useState } from "react";

function App() {
  const [updates, setUpdates] = useState(0);

  useEffect(() => {
    const handleBookingsLoaded = (event) => {
      const bookings = event.detail?.bookings || [];
      const total = bookings.reduce(
        (count, booking) => count + (Number(booking.updateCount) || 0),
        0
      );
      setUpdates(total);
    };

    window.addEventListener("bookings:loaded", handleBookingsLoaded);
    return () => window.removeEventListener("bookings:loaded", handleBookingsLoaded);
  }, []);

  return (
    <p className="update-counter">
      {updates} {updates === 1 ? "update" : "updates"} recorded
    </p>
  );
}

export default App;
