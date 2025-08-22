// server.js
import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load env vars
dotenv.config();

// Initialize Firebase Admin
initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
});
const db = getFirestore();

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// SMS Webhook (Twilio will POST here)
app.post("/sms", async (req, res) => {
  try {
    const incomingMsg = req.body.Body?.trim() || "";
    const from = req.body.From;

    // Example: "BOOK CHENNAI date=2025-08-25 time=15:00"
    // Extract city, date, and time using regex
    const cityMatch = incomingMsg.match(/BOOK\s+(\w+)/i);
    const dateMatch = incomingMsg.match(/(\d{4}-\d{2}-\d{2})/); // YYYY-MM-DD
    const timeMatch = incomingMsg.match(/(\d{1,2}:\d{2})/);     // HH:MM

    if (!cityMatch || !dateMatch || !timeMatch) {
      await client.messages.create({
        body: "Invalid booking format. Please use: BOOK CITY YYYY-MM-DD HH:MM",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: from
      });
      return res.send("<Response></Response>");
    }

    const city = cityMatch[1].toLowerCase();
    const date = dateMatch[1];
    const time = timeMatch[1];

    // Firestore collection: city + "lot"
    const lotCollection = db.collection(city + "lot");

    // Check availability
    const snapshot = await lotCollection
      .where("date", "==", date)
      .where("time", "==", time)
      .get();

    if (!snapshot.empty) {
      // Slot already booked
      await client.messages.create({
        body: `❌ Sorry! No available slot in ${city} on ${date} at ${time}.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: from
      });
      return res.send("<Response></Response>");
    }

    // Otherwise, create booking
    const bookingRef = await lotCollection.add({
      user: from,
      date: date,
      time: time,
      createdAt: new Date().toISOString()
    });

    // Send confirmation SMS
    await client.messages.create({
      body: `✅ Parking booked!\nCity: ${city}\nDate: ${date}\nTime: ${time}\nBooking ID: ${bookingRef.id}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: from
    });

    res.send("<Response></Response>");
  } catch (err) {
    console.error("Error handling SMS:", err);
    res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
