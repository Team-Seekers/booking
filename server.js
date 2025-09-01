// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// ==========================
// BOOKING ROUTES
// ==========================

// Create a booking
app.post("/api/bookings", async (req, res) => {
  try {
    const { slotId, userId, vehicleNumber, startTime, endTime } = req.body;

    if (!slotId || !userId || !vehicleNumber || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newBooking = {
      slotId,
      userId,
      vehicleNumber,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdAt: new Date(),
      status: "Booked",
      paymentComplete: false,
    };

    const bookingRef = await db.collection("bookings").add(newBooking);

    res.status(201).json({ id: bookingRef.id, ...newBooking });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all bookings
app.get("/api/bookings", async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").get();
    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a single booking
app.get("/api/bookings/:id", async (req, res) => {
  try {
    const doc = await db.collection("bookings").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update booking (status, payment, etc.)
app.put("/api/bookings/:id", async (req, res) => {
  try {
    const updateData = req.body;

    await db.collection("bookings").doc(req.params.id).update(updateData);

    res.json({ message: "Booking updated successfully" });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete booking
app.delete("/api/bookings/:id", async (req, res) => {
  try {
    await db.collection("bookings").doc(req.params.id).delete();
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
