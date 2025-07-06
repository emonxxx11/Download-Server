const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK with your service account
const serviceAccount = require('./serviceAccountKey.json'); // put your downloaded JSON here

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://epic-e-sport-default-rtdb.firebaseio.com"
});

const db = admin.database();

// Helper to generate 6 digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /send-otp
// Body: { email: "user@example.com" }
app.post('/send-otp', async (req, res) => {
  const email = req.body.email;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    // Check if user email exists in 'users'
    const usersSnapshot = await db.ref('users').orderByChild('email').equalTo(email).once('value');
    if (!usersSnapshot.exists()) {
      return res.status(404).json({ error: "Email not registered" });
    }

    // Generate OTP
    const otp = generateOTP();

    // Save OTP with expiry timestamp (5 minutes)
    const expiry = Date.now() + 5 * 60 * 1000;
    await db.ref(`otps/${encodeURIComponent(email)}`).set({ otp, expiry });

    // TODO: Send OTP via email here using SendGrid, Nodemailer etc.
    console.log(`OTP for ${email}: ${otp}`);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /verify-otp
// Body: { email: "user@example.com", otp: "123456" }
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Email and OTP required" });

  try {
    const otpSnapshot = await db.ref(`otps/${encodeURIComponent(email)}`).once('value');
    if (!otpSnapshot.exists()) {
      return res.status(400).json({ error: "No OTP found for this email" });
    }

    const { otp: savedOtp, expiry } = otpSnapshot.val();

    if (Date.now() > expiry) {
      // OTP expired - delete
      await db.ref(`otps/${encodeURIComponent(email)}`).remove();
      return res.status(400).json({ error: "OTP expired" });
    }

    if (otp !== savedOtp) {
      return res.status(400).json({ error: "Incorrect OTP" });
    }

    // OTP is correct - delete it after successful verification
    await db.ref(`otps/${encodeURIComponent(email)}`).remove();

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
