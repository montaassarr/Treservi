import { Schema, model } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'staff', 'super_admin'], default: 'owner' },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon' },
    fullName: { type: String },
    isSuperAdmin: { type: Boolean, default: false },
    phone: { type: String },
    specialty: { type: String },
    avatarUrl: { type: String }
  },
  { timestamps: true }
);

export const User = model('User', UserSchema);
