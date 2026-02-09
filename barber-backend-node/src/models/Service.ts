import { Schema, model } from 'mongoose';

const ServiceSchema = new Schema(
  {
    salon_id: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, required: true },
    price: { type: Number, required: true },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Service = model('Service', ServiceSchema);
