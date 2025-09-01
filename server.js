import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import admin from "firebase-admin";
import cors from "cors";

// Load env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Firebase init
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Root
app.get("/", (req, res) => {
  res.send("🚀 Parking Booking SMS server running...");
});

// SMS booking endpoint
app.post("/sms", async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const fromNumber = req.body.From;

  console.log(`📩 Incoming SMS: ${incomingMsg} from ${fromNumber}`);

  const parts = incomingMsg.trim().split(" ");

  if (parts.length < 4 || parts[0].toLowerCase() !== "book") {
    return res.set("Content-Type", "application/xml").send(
      `<Response><Message>❌ Invalid format. Use: BOOK CITY DATE TIME</Message></Response>`
    );
  }

  const [_, city, date, time] = parts;
  const lotRef = db.collection("parkingAreas").doc(city.toLowerCase() + "Lot");

  try {
    const lotSnap = await lotRef.get();
    if (!lotSnap.exists) {
      throw new Error(`No parking lot found for ${city}`);
    }

    const lotData = lotSnap.data();
    let slots = lotData.slots || [];

    // Convert requested start time into ISO format
    const startTime = new Date(`${date}T${time}:00Z`);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1); // booking default 1hr

    let bookedSlot = null;

    // Find first available slot
    for (let slot of slots) {
      let bookings = slot.bookings || [];
      let isAvailable = true;

      for (let booking of bookings) {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);

        // Check if times overlap
        if (
          (startTime >= bookingStart && startTime < bookingEnd) ||
          (endTime > bookingStart && endTime <= bookingEnd)
        ) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
        bookedSlot = slot;
        break;
      }
    }

    if (!bookedSlot) {
      throw new Error(`No available slots at ${city} on ${date} ${time}`);
    }

    // Add booking
    const newBooking = {
      createdAt: new Date().toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: "active",
      userId: fromNumber,
      vehicleNumber: "UNKNOWN", // can be extended
      paymentComplete: false,
    };

    bookedSlot.bookings = bookedSlot.bookings || [];
    bookedSlot.bookings.push(newBooking);

    // Update Firestore
    await lotRef.update({
      slots: slots,
      availableSpots: admin.firestore.FieldValue.increment(-1),
    });

    return res.set("Content-Type", "application/xml").send(
      `<Response><Message>✅ Booking confirmed at ${city} (Slot: ${bookedSlot.slotId}) on ${date} ${time}</Message></Response>`
    );
  } catch (err) {
    console.error("🔥 Booking Error:", err.message);

    return res.set("Content-Type", "application/xml").send(
      `<Response><Message>❌ ${err.message}</Message></Response>`
    );
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
