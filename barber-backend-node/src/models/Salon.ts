import { Schema, model } from 'mongoose';

const SalonSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    owner_email: { type: String, required: true },
    status: { type: String, enum: ['active', 'suspended', 'cancelled'], default: 'active' },
    logo_url: { type: String },
    subscription_plan: { type: String, default: 'basic' },
    contact_phone: { type: String },
    contact_email: { type: String },
    address: { type: String },
    city: { type: String },
    country: { type: String },
    opening_time: { type: String },
    closing_time: { type: String },
    open_days: [{ type: String }],
    latitude: { type: Number },
    longitude: { type: Number },
    total_revenue: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Salon = model('Salon', SalonSchema);
