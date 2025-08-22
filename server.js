// server.js
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming Twilio webhook
app.use(bodyParser.urlencoded({ extended: false 
                              }));
app.get("/", (req, res) => {
  res.send("🚀 SMS server is running...");
});
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

  // Build TwiML response
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(replyMsg);

  // Send back TwiML as response to Twilio
  res.type("text/xml");
  res.send(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
