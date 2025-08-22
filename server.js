import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for received SMS (optional)
const messages = [];

// Twilio client setup
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Middleware to parse incoming Twilio webhook (x-www-form-urlencoded)
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("🚀 SMS server is running...");
});

// View received messages (optional)
app.get("/messages", (req, res) => {
  let html = "<h2>Received SMS messages</h2><ul>";
  messages.forEach(msg => {
    html += `<li><strong>From:</strong> ${msg.from} <strong>To:</strong> ${msg.to} <br> <strong>Body:</strong> ${msg.body}</li>`;
  });
  html += "</ul>";
  res.send(html);
});

// Incoming SMS webhook handler
app.post("/sms", (req, res) => {
  const incomingMsg = req.body.Body || "";
  const fromNumber = req.body.From || "";
  const toNumber = req.body.To || "";

  messages.push({ from: fromNumber, to: toNumber, body: incomingMsg });
  console.log(`📩 Incoming SMS from ${fromNumber}: ${incomingMsg}`);

  let replyMsg;
  if (incomingMsg.toLowerCase().startsWith("book")) {
    replyMsg = `✅ Booking request received: ${incomingMsg}`;
  } else {
    replyMsg = "❌ Invalid format. Please use: Book <City> <YYYY-MM-DD> <Time>";
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(replyMsg);

  res.type("text/xml");
  res.send(twiml.toString());
});

// New endpoint to send SMS programmatically using Messaging Service SID
app.post("/send-sms", express.json(), async (req, res) => {
  const { to, body } = req.body;

  if (!to || !body) {
    return res.status(400).json({ error: "Missing 'to' or 'body' in request" });
  }

  try {
    const message = await client.messages.create({
      to: to,
      body: body,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID, // Use your Messaging Service SID here
    });

    res.json({ sid: message.sid, status: message.status, body: message.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
