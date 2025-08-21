import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Twilio Config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

// Health Check
app.get("/", (req, res) => {
  res.send("🚨 Booking Management Server is running...");
});

// API to send SMS
app.post("/send-sms", async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: "Recipient number and message are required." });
    }

    const sms = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: to,
    });

    res.status(200).json({ success: true, sid: sms.sid });
  } catch (error) {
    console.error("SMS Error:", error);
    res.status(500).json({ error: "Failed to send SMS", details: error.message });
  }
});

// API to receive incoming SMS (Webhook)
app.post("/receive-sms", (req, res) => {
  const smsData = req.body;
  console.log("📩 Incoming SMS:", smsData);

  res.send("<Response><Message>✅ Your request has been received. Stay safe!</Message></Response>");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
