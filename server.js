import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory array to store received messages
let messages = [];

// Middleware to parse incoming Twilio webhook
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("🚀 SMS server is running...");
});

// Endpoint to view all received messages
app.get("/messages", (req, res) => {
  // Simple HTML output of all messages
  let messageList = messages.map(
    (msg, i) => `<li><strong>From:</strong> ${msg.from} <strong>To:</strong> ${msg.to} <strong>Body:</strong> ${msg.body}</li>`
  ).join("");
  res.send(`<h2>Received Messages</h2><ul>${messageList}</ul>`);
});

// Twilio will POST incoming SMS here
app.post("/sms", (req, res) => {
  const incomingMsg = req.body.Body;   // SMS content
  const fromNumber = req.body.From;    // User's phone number
  const toNumber = req.body.To;        // Twilio number

  // Store the message in the in-memory array
  messages.push({ from: fromNumber, to: toNumber, body: incomingMsg });

  console.log(`📩 Incoming SMS from ${fromNumber}: ${incomingMsg}`);

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
