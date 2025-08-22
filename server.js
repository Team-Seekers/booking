import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const messages = []; // in-memory store for received SMS

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("🚀 SMS server is running...");
});

// View all messages (optional)
app.get("/messages", (req, res) => {
  let html = "<h2>Received SMS messages</h2><ul>";
  messages.forEach(msg => {
    html += `<li><strong>From:</strong> ${msg.from} <strong>To:</strong> ${msg.to} <br> <strong>Body:</strong> ${msg.body}</li>`;
  });
  html += "</ul>";
  res.send(html);
});

// Twilio webhook for incoming SMS
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
