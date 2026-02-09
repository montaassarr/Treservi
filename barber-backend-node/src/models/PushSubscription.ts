import { Schema, model } from 'mongoose';

const PushSubscriptionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    endpoint: { type: String, required: true, unique: true },
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
    user_agent: { type: String },
    last_used_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PushSubscription = model('PushSubscription', PushSubscriptionSchema);
