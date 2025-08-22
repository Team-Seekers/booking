// server.js
const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming Twilio webhook
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio Credentials (from .env file)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Twilio will POST incoming SMS here
app.post("/sms", (req, res) => {
  const incomingMsg = req.body.Body;   // SMS content
  const fromNumber = req.body.From;    // User’s phone number
  const toNumber = req.body.To;        // Twilio number

  console.log(`📩 Incoming SMS from ${fromNumber}: ${incomingMsg}`);

  // Example: If user sends "Book Chennai 2025-08-20 10:00AM"
  let replyMsg;
  if (incomingMsg.toLowerCase().startsWith("book")) {
    replyMsg = `✅ Booking request received: ${incomingMsg}`;
  } else {
    replyMsg = `❌ Invalid format. Please use: Book <City> <YYYY-MM-DD> <Time>`;
  }

  // Send SMS reply using Twilio REST API
  client.messages
    .create({
      body: replyMsg,
      from: toNumber,    // Your Twilio number
      to: fromNumber     // User’s number
    })
    .then(message => console.log("✅ Reply sent, SID:", message.sid))
    .catch(err => console.error("❌ Error sending reply:", err));

  // Respond to Twilio with empty 200 OK (prevents re-tries)
  res.status(200).end();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
