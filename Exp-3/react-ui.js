function UpdateCounter() {
  const [updates, setUpdates] = React.useState(0);

  React.useEffect(() => {
    const handleBookingsLoaded = (event) => {
      const bookings = event.detail?.bookings || [];
      const total = bookings.reduce((count, booking) => count + (Number(booking.updateCount) || 0), 0);
      setUpdates(total);
    };

    window.addEventListener("bookings:loaded", handleBookingsLoaded);
    return () => window.removeEventListener("bookings:loaded", handleBookingsLoaded);
  }, []);

  return React.createElement(
    "p",
    { className: "update-counter" },
    `${updates} ${updates === 1 ? "update" : "updates"} recorded`
  );
}

ReactDOM.createRoot(document.getElementById("updateCounter")).render(
  React.createElement(UpdateCounter)
);
