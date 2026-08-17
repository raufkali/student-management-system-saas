const mongoose = require("mongoose");
const { MONGODB_URI, DB_NAME, NODE_ENV } = require("./env");

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log("Database already connected");
    return;
  }

  try {
    // Modern connection options (removed deprecated options)
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      dbName: DB_NAME,
    };

    // Mongoose connection events
    mongoose.connection.on("connected", () => {
      console.log(`✅ MongoDB connected successfully to database: ${DB_NAME}`);
      isConnected = true;
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected");
      isConnected = false;
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await closeDatabase();
      process.exit(0);
    });

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, options);

    // Log connection info
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      console.log(
        `📊 Available collections: ${collections.map((c) => c.name).join(", ") || "None"}`,
      );
    }

    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);

    // Retry connection in development
    if (NODE_ENV === "development") {
      console.log("🔄 Retrying connection in 5 seconds...");
      setTimeout(connectDB, 5000);
    } else {
      throw error;
    }
  }
}

async function closeDatabase() {
  if (mongoose.connection) {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
      isConnected = false;
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    }
  }
}

// Get database instance
function getDB() {
  return mongoose.connection.db;
}

// Check if database is connected
function isDatabaseConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  closeDatabase,
  getDB,
  isDatabaseConnected,
};
