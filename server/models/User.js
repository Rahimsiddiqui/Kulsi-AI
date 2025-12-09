import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false, // Don't return password by default
    },
    fullName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
    },
    emailVerificationCodeExpiresAt: {
      type: Date,
    },
    // Connected OAuth accounts
    connectedAccounts: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Structure:
      // {
      //   google: { id, email, accessToken, connectedAt },
      //   github: { id, email, accessToken, connectedAt }
      // }
    },
    // User plan
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    notesCount: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate verification code
userSchema.methods.generateVerificationCode = function () {
  const code = Math.random().toString().substring(2, 8);
  this.emailVerificationCode = code;
  this.emailVerificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return code;
};

// Method to verify code
userSchema.methods.verifyCode = function (code) {
  return (
    this.emailVerificationCode === code &&
    this.emailVerificationCodeExpiresAt > new Date()
  );
};

export const User = mongoose.model("User", userSchema);
