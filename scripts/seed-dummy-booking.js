const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const envPath = path.join(process.cwd(), ".env");

const parseEnvFile = () => {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value;
  }
  return env;
};

const getArgValue = (flag) => {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPayload = (bookingId, now) => {
  const checkInDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const checkOutDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const toDate = (date) => date.toISOString().slice(0, 10);
  return {
    sessionId: "demo-session",
    hotelCode: "302418",
    hotelName: "Demo Hotel Marina",
    checkInDate: toDate(checkInDate),
    checkOutDate: toDate(checkOutDate),
    destinationCode: "DXB",
    countryCode: "AE",
    currency: "USD",
    nationality: "AM",
    customerRefNumber: bookingId,
    groupCode: 0,
    rooms: [
      {
        roomIdentifier: 1,
        adults: 2,
        childrenAges: [9],
        rateKey: "DEMO-RATE-001",
        guests: [
          {
            firstName: "Aram",
            lastName: "Petrosyan",
            isLeadGuest: true,
            type: "Adult",
            age: 33,
          },
          {
            firstName: "Anna",
            lastName: "Petrosyan",
            type: "Adult",
            age: 31,
          },
          {
            firstName: "Nare",
            lastName: "Petrosyan",
            type: "Child",
            age: 9,
          },
        ],
        price: {
          gross: 680,
          net: 640,
          tax: 40,
        },
      },
    ],
    transferSelection: {
      id: "transfer-demo",
      transferType: "INDIVIDUAL",
      origin: { name: "DXB Airport" },
      destination: { name: "Dubai Marina" },
      vehicle: { name: "Sedan" },
      pricing: { currency: "USD", oneWay: 60 },
      totalPrice: 60,
      paxCount: 3,
    },
    excursions: {
      totalAmount: 120,
      selections: [
        {
          id: "exc-001",
          name: "Desert Safari",
          quantityAdult: 2,
          quantityChild: 1,
          priceAdult: 45,
          priceChild: 30,
          currency: "USD",
          totalPrice: 120,
        },
      ],
    },
    insurance: {
      planId: "insurance-basic",
      planName: "Essential Coverage",
      price: 18,
      currency: "AMD",
    },
    airTickets: {
      origin: "EVN",
      destination: "DXB",
      departureDate: toDate(checkInDate),
      returnDate: toDate(checkOutDate),
      cabinClass: "economy",
      price: 420,
      currency: "USD",
    },
  };
};

const buildResult = () => ({
  sessionId: "demo-session",
  status: "Complete",
  hotelConfirmationNumber: "HTL-DEM-48291",
  adsConfirmationNumber: "ADS-DEM-93422",
  supplierConfirmationNumber: "SUP-DEM-55910",
  customerRefNumber: null,
  rooms: [
    {
      roomIdentifier: 1,
      rateKey: "DEMO-RATE-001",
      status: "Confirmed",
    },
  ],
});

const main = async () => {
  const env = parseEnvFile();
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || env.MONGODB_DB || "megatours_am";
  const email = getArgValue("--email");
  const userId = getArgValue("--userId");

  if (!uri) {
    console.error("Missing MONGODB_URI in environment or .env");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const profiles = db.collection("user_profiles");
  const bookings = db.collection("user_bookings");

  let profile = null;
  if (userId) {
    profile = await profiles.findOne({ userIdString: userId });
  } else if (email) {
    const normalized = email.trim().toLowerCase();
    profile = await profiles.findOne({
      $or: [
        { emailLower: normalized },
        { email: { $regex: `^${escapeRegex(normalized)}$`, $options: "i" } },
      ],
    });
  }

  if (!profile) {
    profile = await profiles.findOne({}, { sort: { lastLoginAt: -1, createdAt: -1 } });
  }

  if (!profile) {
    console.error("No user profiles found. Provide --email or --userId.");
    await client.close();
    process.exit(1);
  }

  const now = new Date();
  const bookingId = `MEGA-DEMO-${now.getTime()}`;
  const payload = buildPayload(bookingId, now);
  const result = buildResult();
  const userIdString = profile.userIdString ?? String(profile.userId ?? "demo-user");

  await bookings.insertOne({
    userId: profile.userId ?? userIdString,
    userIdString,
    source: "seed",
    createdAt: now,
    booking: result,
    payload,
  });

  await profiles.updateOne(
    { userIdString },
    { $set: { lastBookingAt: now } },
    { upsert: true }
  );

  await client.close();

  console.log("Dummy booking created:");
  console.log(`- userIdString: ${userIdString}`);
  console.log(`- bookingId: ${bookingId}`);
  console.log(`- voucher URL: /profile/voucher/${bookingId}`);
};

main().catch((error) => {
  console.error("Failed to seed dummy booking", error);
  process.exit(1);
});
