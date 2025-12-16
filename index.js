import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory OTP store (learning purpose)
const otpStore = new Map();

// Resend SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 587,
  secure: false,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});

// ✅ SEND OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  const otp = Math.floor(100000 + Math.random() * 900000);

  otpStore.set(email, {
    otp,
    expires: Date.now() + 5 * 60 * 1000,
  });

  try {
    await transporter.sendMail({
      from: `Your App <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. Valid for 5 minutes.`,
    });

    res.json({ success: true });
  }catch (err) {
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
  if (!data) return res.status(400).json({ error: "OTP expired" });

  if (Date.now() > data.expires)
    return res.status(400).json({ error: "OTP expired" });

  if (data.otp !== Number(otp))
    return res.status(400).json({ error: "Invalid OTP" });

  otpStore.delete(email);
  res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("OTP server running on port 3000");
});
