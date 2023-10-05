const { DataSource } = require("apollo-datasource");
const { v4: uuidv4 } = require("uuid");
const { format } = require("date-fns");
const Sequelize = require("sequelize");
const Booking = require("../services/bookings/sequelize/models/booking");

class BookingsDb extends DataSource {
  constructor() {
    super();
    const db = this.initializeSequelizeDb();
    this.db = db;
  }

  initialize(config) {
    this.context = config.context;
  }

  initializeSequelizeDb() {
    const config = {
      username: "root",
      password: null,
      database: "database_development",
      dialect: "sqlite",
      storage: "./services/bookings/bookings.db",
      logging: false,
    };
    const sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      config
    );

    const db = {};
    db.Booking = Booking(sequelize, Sequelize.DataTypes);
    db.sequelize = sequelize;
    db.Sequelize = Sequelize;

    return db;
  }

  getHumanReadableDate(date) {
    return format(date, "MMM d, yyyy");
  }

  async getBooking(bookingId) {
    const booking = await this.db.Booking.findByPk(bookingId);
    return booking;
  }

  async getBookingsForUser(userId, status) {
    const filterOptions = { guestId: userId };
    if (status) {
      filterOptions.status = status;
    }
    const bookings = await this.db.Booking.findAll({
      where: { ...filterOptions },
    });
    return bookings.map((b) => b.dataValues);
  }

  async getBookingsForListing(listingId, status) {
    const filterOptions = { listingId };
    if (status) {
      filterOptions.status = status;
    }
    const bookings = await this.db.Booking.findAll({
      where: { ...filterOptions },
    });
    return bookings.map((b) => b.dataValues);
  }

  async getGuestIdForBooking(bookingId) {
    const { guestId } = await this.db.Booking.findOne({
      where: { id: bookingId },
      attributes: ["guestId"],
    });

    return guestId;
  }

  async getListingIdForBooking(bookingId) {
    const { listingId } = await this.db.Booking.findOne({
      where: { id: bookingId },
      attributes: ["listingId"],
    });

    return listingId;
  }

  async isListingAvailable({ listingId, checkInDate, checkOutDate }) {
    const { between, or } = this.db.Sequelize.Op;

    const bookings = await this.db.Booking.findAll({
      where: {
        listingId: listingId,
        [or]: [
          { checkInDate: { [between]: [checkInDate, checkOutDate] } },
          { checkOutDate: { [between]: [checkInDate, checkOutDate] } },
        ],
      },
    });

    return bookings.length === 0;
  }

  async getCurrentlyBookedDateRangesForListing(listingId) {
    const { between, or } = this.db.Sequelize.Op;

    const bookings = await this.db.Booking.findAll({
      where: {
        listingId: listingId,
        [or]: [{ status: "UPCOMING" }, { status: "CURRENT" }],
      },
      attributes: ["checkInDate", "checkOutDate"],
    });

    const bookingsWithDates = bookings.map((b) => ({
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
    }));
    return bookingsWithDates;
  }

  async createBooking({
    listingId,
    checkInDate,
    checkOutDate,
    totalCost,
    guestId,
  }) {
    if (
      await this.isListingAvailable({ listingId, checkInDate, checkOutDate })
    ) {
      const booking = await this.db.Booking.create({
        id: uuidv4(),
        listingId,
        checkInDate,
        checkOutDate,
        totalCost,
        guestId,
        status: "UPCOMING",
      });

      return {
        id: booking.id,
        checkInDate: this.getHumanReadableDate(booking.checkInDate),
        checkOutDate: this.getHumanReadableDate(booking.checkOutDate),
      };
    } else {
      throw new Error(
        "We couldn't complete your request because the listing is unavailable for the given dates."
      );
    }
  }
}

module.exports = BookingsDb;
