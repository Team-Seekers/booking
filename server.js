import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
import admin from "firebase-admin";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Initialize Firebase Admin (it auto-loads serviceAccountKey.json from env var)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

// Root
app.get("/", (req, res) => {
  res.send("🚀 SMS server is running...");
});

// Twilio webhook
app.post("/sms", async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const fromNumber = req.body.From;

  console.log(`📩 Incoming SMS: ${incomingMsg} from ${fromNumber}`);

  // Simple parsing
  const parts = incomingMsg.trim().split(" ");
  if (parts[0].toLowerCase() !== "book") {
    return res.type("text/xml").send(
      `<Response><Message>❌ Invalid format. Use: BOOK CITY DATE TIME</Message></Response>`
    );
  }

  const city = parts[1];
  const date = parts[2];
  const time = parts[3];

  try {
    const lotRef = db.collection(city + "lot").doc("slots");
    const docSnap = await lotRef.get();

    if (!docSnap.exists) {
      return res.type("text/xml").send(
        `<Response><Message>❌ No parking lot found for ${city}</Message></Response>`
      );
    }

    const slots = docSnap.data().slots || [];
    const available = slots.find((s) => !s.booked);

    if (!available) {
      return res.type("text/xml").send(
        `<Response><Message>🚫 No available slots at ${city} on ${date} ${time}</Message></Response>`
      );
    }

    // Update Firestore
    available.booked = true;
    await lotRef.update({ slots });

    return res.type("text/xml").send(
      `<Response><Message>✅ Booking confirmed at ${city} on ${date} ${time}</Message></Response>`
    );
  } catch (err) {
    console.error("🔥 Error:", err);
    return res.type("text/xml").send(
      `<Response><Message>❌ Server error. Try again later.</Message></Response>`
    );
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
