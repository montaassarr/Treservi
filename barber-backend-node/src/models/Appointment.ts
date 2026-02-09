import { Schema, model } from 'mongoose';

const AppointmentSchema = new Schema(
  {
    salon_id: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
    staff_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    customer_name: { type: String, required: true },
    customer_email: { type: String },
    customer_phone: { type: String },
    appointment_date: { type: String, required: true },
    appointment_time: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    amount: { type: Number, default: 0 },
    notes: { type: String },
    is_read: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const Appointment = model('Appointment', AppointmentSchema);
