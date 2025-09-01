// server.js
import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import admin from "firebase-admin";
import fs from "fs";

// Load service account JSON manually
const serviceAccount = JSON.parse(fs.readFileSync("./serviceAccountKey.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<your-project-id>.firebaseio.com"
});

const db = admin.firestore();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.post("/sms", async (req, res) => {
  const incomingMsg = req.body.Body.trim();
  const from = req.body.From;

  try {
    if (incomingMsg.startsWith("BOOK")) {
      const [, location, date, time] = incomingMsg.split(" ");
      const slotRef = db.collection("parkingSlots")
        .doc(`${location}_${date}_${time}`);
      const doc = await slotRef.get();

      if (doc.exists) {
        // Already booked
        await twilioClient.messages.create({
          body: `❌ Slot unavailable at ${location} on ${date} ${time}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: from
        });
      } else {
        // Book slot
        await slotRef.set({
          location,
          date,
          time,
          bookedBy: from,
          createdAt: new Date()
        });
        await twilioClient.messages.create({
          body: `✅ Slot booked at ${location} on ${date} ${time}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: from
        });
      }
    } else {
      await twilioClient.messages.create({
        body: "⚠️ Invalid format. Use: BOOK <location> <YYYY-MM-DD> <HH:MM>",
        from: process.env.TWILIO_PHONE_NUMBER,
        to: from
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("🚀 Server running on port 3000"));
