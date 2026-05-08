import { Schema, model, Types } from "mongoose";
import { ROLES } from "../config/roles";

const UserSchema = new Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    set: (value: string | null | undefined) => {
      const normalized = (value || "").trim();
      return normalized ? normalized : undefined;
    }
  },
  role: {
    type: String,
    enum: Object.values(ROLES), // This will be ["customer", "partner", "admin", "delivery"]
    default: ROLES.CUSTOMER
  },
  // ADD THIS ADDRESS FIELD
  address: {
    recipientName: {
      type: String,
      default: ""
    },
    houseFlatDoorNo: {
      type: String,
      default: ""
    },
    buildingApartmentName: {
      type: String,
      default: ""
    },
    streetRoadName: {
      type: String,
      default: ""
    },
    street: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    pincode: {
      type: String,
      default: ""
    },
    area: {
      type: String,
      default: ""
    },
    landmark: {
      type: String,
      default: ""
    },
    cityTownVillage: {
      type: String,
      default: ""
    },
    district: {
      type: String,
      default: ""
    },
    country: {
      type: String,
      default: "India"
    }
  },
  fcmToken: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sessionVersion: {
    type: Number,
    default: 0
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string" } }
  }
);

const User = model("User", UserSchema);

export const ensureUserIndexes = async () => {
  const indexes = await User.collection.indexes();
  const emailIndex = indexes.find((index) => index.name === "email_1");
  const hasPartialEmailIndex = Boolean(emailIndex?.partialFilterExpression);

  if (emailIndex && !hasPartialEmailIndex) {
    await User.collection.dropIndex("email_1");
  }

  await User.createIndexes();
};

export default User;
