import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory OTP store (learning purpose)
const otpStore = new Map();

// ✅ Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ SEND OTP
app.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // ✅ Send email using Resend API
    await resend.emails.send({
      from: `Your App <${process.env.FROM_EMAIL}>`, // no-reply@yourdomain.com
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Your OTP is: ${otp}</h2>
        <p>This OTP is valid for 5 minutes.</p>
      `,
    });

    res.json({ success: true, message: "OTP sent successfully" });

  } catch (err) {
    console.error("EMAIL ERROR 👉", err);
    res.status(500).json({
      error: "Email failed",
      details: err.message,
    });
  }
});

// ✅ VERIFY OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  const data = otpStore.get(email);
  if (!data) {
    return res.status(400).json({ error: "OTP expired or not found" });
  }

  if (Date.now() > data.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: "OTP expired" });
  }

  if (data.otp !== Number(otp)) {
    return res.status(400).json({ error: "Invalid OTP" });
  }

  otpStore.delete(email);
  res.json({ success: true, message: "OTP verified successfully" });
});

// ✅ IMPORTANT: Use Render PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OTP server running on port ${PORT}`);
});
