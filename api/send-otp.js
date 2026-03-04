import nodemailer from "nodemailer";

let otpStore = {};

export default async function handler(req, res) {

  /* ---- CORS FIX ---- */

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  /* ---- READ BODY ---- */

  const { email, otp, verify } = req.body || {};

  /* ---- VERIFY OTP ---- */

  if (verify) {

    const record = otpStore[email];

    if (!record) {
      return res.status(400).json({ success: false });
    }

    if (record.code != otp || Date.now() > record.expires) {
      return res.status(400).json({ success: false });
    }

    delete otpStore[email];

    return res.status(200).json({ success: true });
  }

  /* ---- SEND OTP ---- */

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  const generatedOtp = Math.floor(100000 + Math.random() * 900000);

  otpStore[email] = {
    code: generatedOtp,
    expires: Date.now() + 5 * 60 * 1000
  };

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_USER,
      pass: process.env.BREVO_PASS
    }
  });

  try {

    await transporter.sendMail({
      from: "no-reply@cupx.in",
      to: email,
      subject: "CupX Email Verification",
      text: `Your OTP is ${generatedOtp}. It expires in 5 minutes.`,
      replyTo: "info@cupx.in"
    });

    return res.status(200).json({ success: true });

  } catch (error) {

    console.error("MAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Email send failed"
    });

  }

}
