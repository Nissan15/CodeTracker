const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const connectDB = async (retryCount = 0) => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set!');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // timeout after 10s
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`);

    if (retryCount < MAX_RETRIES - 1) {
      console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    }

    // After all retries, log but DO NOT exit — let the server stay alive
    // so Render health checks pass. DB-dependent routes will return 503.
    console.error('❌ All MongoDB connection attempts failed. Server will run without DB.');
    console.error('   → Check MongoDB Atlas Network Access: add 0.0.0.0/0 to allow Render IPs.');
    console.error(`   → MONGODB_URI set: ${!!process.env.MONGODB_URI}`);
  }
};

module.exports = connectDB;
