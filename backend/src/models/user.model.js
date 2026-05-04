import mongoose from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      match: [/^[6-9]\d{9}$/, "Enter valid Indian phone number"],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, 
    },

    role: {
      type: String,
      enum: ["farmer", "admin"],
      default: "farmer",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otp: {
      code: String,
      expiresAt: Date,
    },

    location: {
      state: String,
      district: String,
      village: String,
      pincode: String,
    },

    farmingDetails: {
      landSize: Number, // in acres
      soilType: {
        type: String,
        enum: ["clay", "sandy", "loamy", "silty"],
      },
      irrigationType: {
        type: String,
        enum: ["rainfed", "drip", "canal", "sprinkler"],
      },
      cropsGrown: [String],
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);