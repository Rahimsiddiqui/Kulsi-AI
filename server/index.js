// Load environment variables
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file relative to server directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// NOW import other modules that need env vars
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";

// 3. Middleware & Helpers

// 4. Constants

// 5. App setup
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth Routes
console.log("[DEBUG] Registering /api/auth routes");
app.use("/api/auth", authRoutes);

if (isProduction) {
  console.log = () => {};
}

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, "../dist")));

// Catch-all SPA fallback (logs unhandled routes)
app.use((req, res) => {
  console.log(
    `[DEBUG] Catch-all fallback for route: ${req.method} ${req.path}`
  );
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

async function connectToMongoDB(retries = 10, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[MongoDB] Connection attempt ${attempt}/${retries}...`);
      await mongoose.connect(MONGODB_URI);
      console.log("✅ MongoDB connected successfully! 🚀");
      return true;
    } catch (err) {
      console.warn(
        `❌ MongoDB connection failed (attempt ${attempt}/${retries}): ${err.message}`
      );
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  console.error(
    `⚠️  MongoDB connection failed after ${retries} attempts. Proceeding without database.`
  );
  return false;
}

async function startServer() {
  try {
    // Connect to MongoDB with retry logic
    let mongoConnected = false;
    if (MONGODB_URI) {
      mongoConnected = await connectToMongoDB(10, 1000); // 10 retries, 1 second delay
    } else {
      console.warn("⚠️ MONGODB_URI not configured. Running without database.");
    }

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      if (mongoConnected) {
        console.log("✅ Database: Connected");
      } else {
        console.log("⚠️ Database: Not connected");
      }
    });
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
}

startServer();
