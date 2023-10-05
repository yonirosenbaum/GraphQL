const express = require("express");
const {
  getDifferenceInDays,
  transformListingWithAmenities,
} = require("./helpers");
const { v4: uuidv4 } = require("uuid");
const app = express();
const port = 4010 || process.env.PORT;

const listingsDb = require("./sequelize/models");
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/listings", async (req, res) => {
  const { page = 1, limit = 5, sortBy } = req.query;
  const skipValue = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const { numOfBeds: minNumOfBeds } = req.query;
  const { gte } = listingsDb.Sequelize.Op;

  let sortOrder = ["costPerNight", "DESC"];
  if (sortBy === "COST_ASC") {
    sortOrder = ["costPerNight", "ASC"];
  }

  const listings = await listingsDb.Listing.findAll({
    where: {
      numOfBeds: {
        [gte]: minNumOfBeds,
      },
    },
    order: [sortOrder],
    limit: parseInt(limit, 10),
    offset: skipValue,
  });

  return res.json(listings);
});

app.get("/featured-listings", async (req, res) => {
  const { limit } = req.query;
  const listings = await listingsDb.Listing.findAll({
    where: {
      isFeatured: true,
    },
    limit,
  });

  return res.json(listings);
});
app.get("/user/:userId/listings", async (req, res) => {
  const listings = await listingsDb.Listing.findAll({
    where: { hostId: req.params.userId },
  });
  return res.json(listings);
});

app.get("/listings/:listingId", async (req, res) => {
  const listingInstance = await listingsDb.Listing.findOne({
    where: { id: req.params.listingId },
    include: listingsDb.Amenity,
  });
  const listingToReturn = transformListingWithAmenities(listingInstance);

  return res.json(listingToReturn);
});

app.get("/listings/:listingId/totalCost", async (req, res) => {
  const { costPerNight } = await listingsDb.Listing.findOne({
    where: { id: req.params.listingId },
    attributes: ["costPerNight"],
  });

  if (!costPerNight) {
    return res.status(400).send("Could not find listing with specified ID");
  }

  const { checkInDate, checkOutDate } = req.query;
  const diffInDays = getDifferenceInDays(checkInDate, checkOutDate);

  if (diffInDays === NaN) {
    return res
      .status(400)
      .send(
        "Could not calculate total cost. Please double check the check-in and check-out date format."
      );
  }

  return res.json({ totalCost: costPerNight * diffInDays });
});

app.get("/listing/amenities", async (req, res) => {
  const amenities = await listingsDb.Amenity.findAll();
  return res.json(amenities);
});

app.post("/listings", async (req, res) => {
  const listingData = req.body.listing;
  const amenitiesData = req.body.listing.amenities;
  const id = uuidv4();

  const listing = await listingsDb.Listing.create({
    id,
    ...listingData,
  });

  await listing.setAmenities(amenitiesData);

  let updatedListing = await listingsDb.Listing.findOne({
    include: listingsDb.Amenity,
    where: { id },
  });
  const listingToReturn = transformListingWithAmenities(updatedListing);

  return res.json(listingToReturn);
});

// edit a listing
app.patch("/listings/:listingId", async (req, res) => {
  let listing = await listingsDb.Listing.findOne({
    include: listingsDb.Amenity,
    where: { id: req.params.listingId },
  });

  const newListing = req.body.listing;
  const newAmenities = req.body.listing.amenities;

  await listing.update({ ...newListing });
  await listing.setAmenities(newAmenities);

  let updatedListing = await listingsDb.Listing.findOne({
    include: listingsDb.Amenity,
    where: { id: req.params.listingId },
  });
  const listingToReturn = transformListingWithAmenities(updatedListing);

  return res.json(listingToReturn);
});

app.listen(port, () => {
  console.log(`Listing API running at http://localhost:${port}`);
});
