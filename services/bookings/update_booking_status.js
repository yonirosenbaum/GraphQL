const { Sequelize, sequelize } = require("./sequelize/models");

(async () => {
  const { or, and, lt, gt } = Sequelize.Op;
  try {
    const [completedBookings] = await sequelize.models.Booking.update(
      { status: "COMPLETED" },
      {
        where: {
          [or]: [{ status: "UPCOMING" }, { status: "CURRENT" }],
          checkOutDate: {
            [lt]: new Date(),
          },
        },
      }
    );
    if (completedBookings > 0) {
      console.log(
        `Bookings DB: successfully updated booking status of ${completedBookings} rows to COMPLETED`
      );
    }

    const [currentBookings] = await sequelize.models.Booking.update(
      { status: "CURRENT" },
      {
        where: {
          status: "UPCOMING",
          checkInDate: { [lt]: new Date() },
          checkOutDate: { [gt]: new Date() },
        },
      }
    );
    if (currentBookings > 0) {
      console.log(
        `Bookings DB: successfully updated booking status of ${currentBookings} rows to CURRENT`
      );
    }
  } catch (e) {
    console.error(e);
  }
})();
