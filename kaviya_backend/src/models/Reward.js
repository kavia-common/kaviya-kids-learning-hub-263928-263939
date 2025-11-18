import mongoose from 'mongoose';

const { Schema } = mongoose;

const rewardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    petStage: { type: Number, default: 1 },
    stickers: { type: [String], default: [] },
    spinAvailable: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('Reward', rewardSchema);
