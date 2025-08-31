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

// Initialize Firebase Admin
// Make sure GOOGLE_APPLICATION_CREDENTIALS points to your serviceAccountKey.json
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

// Root
app.get("/", (req, res) => {
  res.send("🚀 SMS server is running...");
});

// Twilio Webhook
app.post("/sms", async (req, res) => {
  const incomingMsg = req.body.Body || "";
  const fromNumber = req.body.From;

  console.log(`📩 Incoming SMS: ${incomingMsg} from ${fromNumber}`);

  const parts = incomingMsg.trim().split(" ");

  // Validate SMS format
  if (parts.length < 4 || parts[0].toLowerCase() !== "book") {
    return res.set("Content-Type", "application/xml").send(
      `<Response><Message>❌ Invalid format. Use: BOOK CITY DATE TIME</Message></Response>`
    );
  }

  const [_, city, date, time] = parts;
  const lotRef = db.collection(city.toLowerCase() + "lot").doc("slots");

  try {
    await db.runTransaction(async (t) => {
      let doc = await t.get(lotRef);

      // If document doesn’t exist, create it with empty slots
      if (!doc.exists) {
        console.log(`⚠️ No parking lot found for ${city}, creating new one...`);
        t.set(lotRef, { slots: [] });
        throw new Error(`No parking slots available for ${city} yet`);
      }

      const data = doc.data();
      let slots = data.slots || [];

      // Find slot for given date/time
      const index = slots.findIndex(
        (s) => s.date === date && s.time === time && !s.booked
      );

      if (index === -1) {
        throw new Error(`🚫 No slots available at ${city} on ${date} ${time}`);
      }

      // Mark slot as booked
      slots[index].booked = true;
      t.update(lotRef, { slots });
    });

    return res.set("Content-Type", "application/xml").send(
      `<Response><Message>✅ Booking confirmed at ${city} on ${date} ${time}</Message></Response>`
    );
  } catch (err) {
    console.error("🔥 Booking Error:", err.message);

    return res.set("Content-Type", "application/xml").send(
      `<Response><Message>❌ ${err.message}</Message></Response>`
    );
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
