// server.js
import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";

const app = express();
const port = 3000;

// Twilio config (replace with real creds in production)
const accountSid = "ACXXXXXXXXXXXXXXXXXXXX"; // from Twilio console
const authToken = "your_auth_token"; // from Twilio console
const twilioClient = twilio(accountSid, authToken);
const twilioNumber = "+1234567890"; // your Twilio number

app.use(bodyParser.urlencoded({ extended: false }));

// Mock parking lots (city+"lots")
let parkingDB = {
  chennailots: [
    { slotId: 1, time: "2025-08-23 10:00", booked: false },
    { slotId: 2, time: "2025-08-23 11:00", booked: false },
    { slotId: 3, time: "2025-08-23 12:00", booked: false },
  ],
  bangalorelots: [
    { slotId: 1, time: "2025-08-23 10:00", booked: false },
    { slotId: 2, time: "2025-08-23 11:00", booked: true }, // already booked
  ],
};

// Helper: parse message "BOOK CHENNAI 2025-08-23 10:00"
function parseBookingMessage(body) {
  let parts = body.trim().split(" ");
  if (parts.length < 4 || parts[0].toUpperCase() !== "BOOK") {
    return null;
  }
  let city = parts[1].toLowerCase();
  let date = parts[2];
  let time = parts[3];
  return { city, datetime: `${date} ${time}` };
}

// Webhook for SMS
app.post("/sms", async (req, res) => {
  const incomingMsg = req.body.Body;
  const fromNumber = req.body.From;

  const bookingReq = parseBookingMessage(incomingMsg);

  if (!bookingReq) {
    return res.type("text/xml").send(`
      <Response>
        <Message>Invalid format. Use: BOOK CITY YYYY-MM-DD HH:MM</Message>
      </Response>
    `);
  }

  const { city, datetime } = bookingReq;
  const lotKey = city + "lots";

  if (!parkingDB[lotKey]) {
    return res.type("text/xml").send(`
      <Response>
        <Message>No parking lots available in ${city.toUpperCase()}.</Message>
      </Response>
    `);
  }

  // Check availability
  let lots = parkingDB[lotKey];
  let slot = lots.find((s) => s.time === datetime && !s.booked);

  if (slot) {
    slot.booked = true;
    return res.type("text/xml").send(`
      <Response>
        <Message>✅ Booking Confirmed at ${city.toUpperCase()} - Slot ${slot.slotId} on ${datetime}</Message>
      </Response>
    `);
  } else {
    return res.type("text/xml").send(`
      <Response>
        <Message>❌ Sorry, no slots available at ${city.toUpperCase()} for ${datetime}</Message>
      </Response>
    `);
  }
});

app.listen(port, () => {
  console.log(`🚗 Parking server running at http://localhost:${port}`);
});
