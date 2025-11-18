import mongoose from 'mongoose';

const { Schema } = mongoose;

const questionSchema = new Schema(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true, validate: v => v.length >= 2 },
    answerIndex: { type: Number, required: true }
  },
  { _id: false }
);

const quizSchema = new Schema(
  {
    subject: { type: String, required: true, index: true },
    questions: { type: [questionSchema], required: true }
  },
  { timestamps: true }
);

export default mongoose.model('Quiz', quizSchema);
