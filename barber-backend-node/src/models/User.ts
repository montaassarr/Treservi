import { Schema, model } from 'mongoose';

const SENSITIVE_FIELDS = ['passwordHash'] as const;

const stripSensitiveFields = (_doc: unknown, ret: Record<string, unknown>) => {
  for (const field of SENSITIVE_FIELDS) {
    delete ret[field];
  }
  return ret;
};

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    // Never returned by queries unless explicitly requested with .select('+passwordHash')
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['owner', 'staff', 'super_admin'], default: 'owner' },
    salonId: { type: Schema.Types.ObjectId, ref: 'Salon' },
    fullName: { type: String },
    isSuperAdmin: { type: Boolean, default: false },
    phone: { type: String },
    specialty: { type: String },
    avatarUrl: { type: String }
  },
  {
    timestamps: true,
    toJSON: { transform: stripSensitiveFields },
    toObject: { transform: stripSensitiveFields }
  }
);

export const User = model('User', UserSchema);
