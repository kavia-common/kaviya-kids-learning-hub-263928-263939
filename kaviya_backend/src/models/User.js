import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['kid', 'parent'], required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    avatar: { type: String },
    badges: { type: [String], default: [] },
    children: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
