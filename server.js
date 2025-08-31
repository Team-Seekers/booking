import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import admin from "firebase-admin";
import { readFileSync } from "fs";

// Load Firebase service account key
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(bodyParser.json());

// 🔹 Book a slot
app.post("/book", async (req, res) => {
  try {
    const { slotId, userId, vehicleNumber, startTime, endTime } = req.body;

    if (!slotId || !userId || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const bookingsRef = db.collection("bookings");
    const snapshot = await bookingsRef
      .where("slotId", "==", slotId)
      .where("endTime", ">", startTime) // overlapping check
      .where("startTime", "<", endTime)
      .get();

    if (!snapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Slot is already booked for this time",
      });
    }

    // If available → create booking
    const newBooking = {
      slotId,
      userId,
      vehicleNumber: vehicleNumber || null,
      startTime,
      endTime,
      createdAt: admin.firestore.Timestamp.now(),
      status: "Booked",
      paymentComplete: false,
    };

    const bookingDoc = await bookingsRef.add(newBooking);

    return res.json({
      success: true,
      message: "Slot booked successfully",
      bookingId: bookingDoc.id,
    });
  } catch (err) {
    console.error("Error booking slot:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 🔹 Check slot availability
app.get("/availability/:slotId", async (req, res) => {
  try {
    const { slotId } = req.params;
    const { startTime, endTime } = req.query;

    const bookingsRef = db.collection("bookings");
    const snapshot = await bookingsRef
      .where("slotId", "==", slotId)
      .where("endTime", ">", startTime)
      .where("startTime", "<", endTime)
      .get();

    if (snapshot.empty) {
      return res.json({ available: true });
    } else {
      return res.json({ available: false });
    }
  } catch (err) {
    console.error("Error checking availability:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
