import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import {
  generateVerificationCode,
  sendVerificationEmail,
} from "../utils/email.js";
import {
  exchangeCodeForToken,
  getOAuthUserInfo,
  findOrCreateOAuthUser,
} from "../utils/oauthHelper.js";

const router = express.Router();

// Cache for OAuth code processing results (to handle duplicate requests)
const oauthCodeCache = new Map();

// Middleware to verify JWT token
export const authMiddleware = async (req, res, next) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server configuration error: JWT_SECRET not set" });
    }

    const authHeader = req.headers.authorization;

    // Use Authorization header only (ignore old cookie tokens)
    const token = authHeader?.split(" ")[1];

    if (!token) {
      console.warn("[AUTH] No token provided in request");
      return res.status(401).json({ message: "No token provided" });
    }

    // Decode token and attach user to request
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id || decoded.userId;

      // Find user in DB
      const user = await User.findById(req.userId);

      if (!user) {
        console.warn(`[AUTH] User not found for ID: ${req.userId}`);
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (tokenErr) {
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (err) {
    console.error("[AUTH] Middleware error:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Sign Up
router.post("/signup", async (req, res) => {
  const { email, password, fullName, name } = req.body;
  const userFullName = fullName || name;

  try {
    // Validation
    if (!email || !password || !userFullName) {
      return res.status(400).json({
        message: "Email, password, and full name are required",
      });
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isEmailVerified) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const codeExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

    let user;

    if (existingUser && !existingUser.isEmailVerified) {
      // User exists but not verified - update their info and resend code
      existingUser.password = hashedPassword;
      existingUser.fullName = userFullName;
      existingUser.emailVerificationCode = verificationCode;
      existingUser.emailVerificationCodeExpiresAt = codeExpires;
      user = await existingUser.save();
    } else {
      // Create new user
      user = await User.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName: userFullName,
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationCodeExpiresAt: codeExpires,
      });
    }

    // Send verification email
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({
      message:
        "Registration successful! Please check your email for the verification code.",
      userId: user._id,
      email: user.email,
    });
  } catch (err) {
    console.error("[ERROR] Signup failed:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        message: "Please verify your email first.",
        needsVerification: true,
        userId: user._id,
        email: user.email,
      });
    }

    // Check if user has a password
    if (!user.password) {
      return res.status(401).json({
        message:
          "This account was created with OAuth. Please sign in with Google or GitHub, or set a password in settings.",
        isOAuthAccount: true,
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Check connected accounts
      if (
        user.connectedAccounts &&
        Object.keys(user.connectedAccounts).length > 0
      ) {
        const providers = Object.keys(user.connectedAccounts)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" or ");
        return res.status(401).json({
          message: `Invalid credentials. You registered with ${providers}. Please use that instead.`,
        });
      }
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server configuration error: JWT_SECRET not set" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        avatar: user.avatar,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("[ERROR] Login failed:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Verify email with code
router.post("/verify-email", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        message: "Email and verification code are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check verification code
    if (user.emailVerificationCode !== code) {
      return res.status(401).json({ message: "Invalid verification code" });
    }

    // Check if code is expired
    if (user.emailVerificationCodeExpiresAt < Date.now()) {
      return res.status(401).json({ message: "Verification code has expired" });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpiresAt = undefined;
    await user.save();

    // Generate token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server configuration error: JWT_SECRET not set" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        plan: user.plan,
      },
    });
  } catch (err) {
    console.error("[ERROR] Email verification failed:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Get Current User
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.fullName,
      avatar: req.user.avatar,
      plan: req.user.plan,
    },
  });
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("authToken");
  res.json({ message: "Logged out successfully" });
});

// Resend Verification Code
router.post("/resend-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Generate new code
    const verificationCode = generateVerificationCode();
    const codeExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpiresAt = codeExpires;
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, verificationCode);

    res.json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error("[ERROR] Resend code failed:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Change Password (Protected)
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user.password) {
      return res.status(400).json({
        message:
          "This account was created with OAuth. You cannot change password.",
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("[ERROR] Change password failed:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// Delete Account (Protected)
router.post("/delete-account", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.user._id);

    // Verify password if user has one
    if (user.password) {
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Password is incorrect" });
      }
    }

    // Delete user
    await User.findByIdAndDelete(user._id);

    res.clearCookie("authToken");
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("[ERROR] Delete account failed:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// OAuth Initiate - Google
router.post("/oauth/google", (req, res) => {
  const redirectUri = `${
    process.env.FRONTEND_URL || "http://localhost:5173"
  }/auth/callback`;
  console.log("[Google OAuth Initiate] Redirect URI:", redirectUri);

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
    {
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
    }
  ).toString()}`;

  res.json({ success: true, url: googleAuthUrl });
});

// OAuth Initiate - GitHub
router.post("/oauth/github", (req, res) => {
  const redirectUri = `${
    process.env.FRONTEND_URL || "http://localhost:5173"
  }/auth/callback`;
  console.log("[GitHub OAuth Initiate] Redirect URI:", redirectUri);

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams(
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "user:email",
    }
  ).toString()}`;

  res.json({ success: true, url: githubAuthUrl });
});

// OAuth Callback Handler
router.post("/oauth/callback", async (req, res) => {
  const { provider, code } = req.body;

  try {
    if (!["google", "github"].includes(provider)) {
      return res.status(400).json({ message: "Invalid OAuth provider" });
    }

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is required" });
    }

    // Create a cache key for this code
    const codeKey = `${provider}:${code}`;

    // Check if this code was already processed
    if (oauthCodeCache.has(codeKey)) {
      const cachedResult = oauthCodeCache.get(codeKey);
      console.log(
        `[OAuth Callback] Returning cached result for ${provider}: ${code.substring(
          0,
          10
        )}...`
      );
      return res.status(cachedResult.status).json(cachedResult.data);
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error("[ERROR] JWT_SECRET is not configured");
      return res
        .status(500)
        .json({ message: "Server configuration error: JWT_SECRET not set" });
    }

    const redirectUri = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/auth/callback`;

    console.log(
      `[OAuth Callback] Provider: ${provider}, Redirect URI: ${redirectUri}`
    );

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(provider, code, redirectUri);
    console.log(`[OAuth Callback] Access token obtained for ${provider}`);

    // Get OAuth user info
    const oauthUser = await getOAuthUserInfo(provider, accessToken);
    console.log(`[OAuth Callback] OAuth user retrieved: ${oauthUser.email}`);

    // Find or create user
    const user = await findOrCreateOAuthUser(User, oauthUser);
    console.log(`[OAuth Callback] User found or created: ${user._id}`);

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    console.log(`[OAuth Callback] JWT token generated for user ${user._id}`);
    console.log(`[OAuth Callback] Token: ${token.substring(0, 50)}...`);
    console.log(`[OAuth Callback] JWT_SECRET length: ${JWT_SECRET.length}`);

    const responseData = {
      message: "OAuth authentication successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        avatar: user.avatar,
        plan: user.plan,
        connectedAccounts: user.connectedAccounts,
      },
    };

    // Cache the successful response for 5 minutes
    oauthCodeCache.set(codeKey, { status: 200, data: responseData });
    setTimeout(() => {
      oauthCodeCache.delete(codeKey);
    }, 5 * 60 * 1000);

    res.status(200).json(responseData);
  } catch (err) {
    console.error("[ERROR] OAuth callback failed:", err);
    console.error("[ERROR] Stack:", err.stack);

    // Cache error responses for 1 minute to prevent retry spam
    const codeKey = `${provider}:${code}`;
    const errorData = {
      message: "OAuth authentication failed",
      error: err.message,
    };
    oauthCodeCache.set(codeKey, { status: 500, data: errorData });
    setTimeout(() => {
      oauthCodeCache.delete(codeKey);
    }, 60 * 1000);

    res.status(500).json(errorData);
  }
});

// Link OAuth Account (Protected)
router.post("/oauth/link", authMiddleware, async (req, res) => {
  const { provider, code } = req.body;

  try {
    if (!["google", "github"].includes(provider)) {
      return res.status(400).json({ message: "Invalid OAuth provider" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const redirectUri = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/auth/callback`;

    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(provider, code, redirectUri);

    // Get OAuth user info
    const oauthUser = await getOAuthUserInfo(provider, accessToken);

    // Check if already linked to another user
    const existingUser = await User.findOne({
      [`connectedAccounts.${provider}.id`]: oauthUser.providerId,
    });

    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({
        message: "This OAuth account is already linked to another user",
      });
    }

    // Link OAuth account
    if (!user.connectedAccounts) {
      user.connectedAccounts = {};
    }

    user.connectedAccounts[provider] = {
      id: oauthUser.providerId,
      email: oauthUser.email,
      accessToken,
      connectedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      message: `${
        provider.charAt(0).toUpperCase() + provider.slice(1)
      } account linked successfully`,
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        connectedAccounts: user.connectedAccounts,
      },
    });
  } catch (err) {
    console.error("[ERROR] OAuth link failed:", err);
    res.status(500).json({
      message: "Failed to link OAuth account",
      error: err.message,
    });
  }
});

// Disconnect OAuth Account (Protected)
router.delete(
  "/oauth/disconnect/:provider",
  authMiddleware,
  async (req, res) => {
    const { provider } = req.params;

    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.connectedAccounts && user.connectedAccounts[provider]) {
        delete user.connectedAccounts[provider];
        await user.save();

        res.status(200).json({
          message: `${
            provider.charAt(0).toUpperCase() + provider.slice(1)
          } account disconnected successfully`,
        });
      } else {
        res.status(404).json({ message: "OAuth account not connected" });
      }
    } catch (err) {
      console.error("[ERROR] OAuth disconnect failed:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
