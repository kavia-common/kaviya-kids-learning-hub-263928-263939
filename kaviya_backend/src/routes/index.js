import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Progress from '../models/Progress.js';
import Reward from '../models/Reward.js';
import { asyncHandler, ApplicationError } from '../utils/errors.js';
import { authenticate, authorize, generateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper constants
const XP_PER_CORRECT = 10;
const LEVEL_XP = 100;
const STICKER_POOL = [
  'star', 'rocket', 'panda', 'unicorn', 'trophy', 'lightbulb', 'rainbow', 'book', 'medal', 'smile'
];

/**
// PUBLIC_INTERFACE
POST /signup
Body: { username, password, role }
Creates a new user (kid or parent). For kid, also creates a Reward document.
Returns: { token, user: { id, username, role, xp, level, badges } }
*/
router.post('/signup', asyncHandler(async (req, res) => {
  const { username, password, role } = req.body || {};
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'INFO', route: 'POST /api/signup', username: username || null, role: role || null, ts: new Date().toISOString() }));

  if (!username || !password || !role || !['kid', 'parent'].includes(role)) {
    throw new ApplicationError('Invalid input', 'VALIDATION_ERROR', 400);
  }

  const existing = await User.findOne({ username }).lean();
  if (existing) {
    throw new ApplicationError('Username already exists', 'USERNAME_TAKEN', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash, role });

  if (role === 'kid') {
    await Reward.create({ userId: user._id });
  }

  const token = generateToken({ id: user._id.toString(), role: user.role });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'INFO', route: 'POST /api/signup', outcome: 'success', userId: String(user._id), role: user.role, ts: new Date().toISOString() }));

  return res.status(201).json({
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      xp: user.xp,
      level: user.level,
      badges: user.badges
    }
  });
}));

/**
// PUBLIC_INTERFACE
POST /login
Body: { username, password }
Returns: { token, user: { id, username, role, xp, level, badges } }
*/
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  // Minimal structured log without sensitive data
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'INFO', route: 'POST /api/login', username: username || null, ts: new Date().toISOString() }));

  if (!username || !password) {
    throw new ApplicationError('Invalid input', 'VALIDATION_ERROR', 400);
  }

  const user = await User.findOne({ username }).select('+passwordHash');
  if (!user) {
    throw new ApplicationError('Invalid credentials', 'AUTH_INVALID', 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new ApplicationError('Invalid credentials', 'AUTH_INVALID', 401);
  }

  const token = generateToken({ id: user._id.toString(), role: user.role });
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ level: 'INFO', route: 'POST /api/login', outcome: 'success', userId: String(user._id), role: user.role, ts: new Date().toISOString() }));

  return res.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      xp: user.xp,
      level: user.level,
      badges: user.badges
    }
  });
}));

/**
// PUBLIC_INTERFACE
GET /quiz/:subject
Query: ?revealAnswers=true to include answerIndex
Returns quiz questions for subject. By default hides answers.
*/
router.get('/quiz/:subject', asyncHandler(async (req, res) => {
  const { subject } = req.params;
  const reveal = String(req.query.revealAnswers || 'false').toLowerCase() === 'true';

  const quiz = await Quiz.findOne({ subject }).lean();
  if (!quiz) {
    throw new ApplicationError('Quiz not found', 'NOT_FOUND', 404);
  }

  const questions = quiz.questions.map((q) => {
    const base = { question: q.question, options: q.options };
    if (reveal) {
      return { ...base, answerIndex: q.answerIndex };
    }
    return base;
  });

  return res.json({ quiz: { id: quiz._id, subject: quiz.subject, questions } });
}));

/**
// PUBLIC_INTERFACE
GET /dashboard/:id (protected - kid or parent)
Returns basic profile for kid: { xp, level, badges }
- Parents can fetch for any of their listed children.
- Kids can fetch only their own id.
*/
router.get('/dashboard/:id', authenticate, authorize(['kid', 'parent']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApplicationError('Invalid id', 'VALIDATION_ERROR', 400);
  }

  // Authorization: kids self; parents must have the child linked
  if (req.user.role === 'kid' && req.user.id !== id) {
    throw new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403);
  }
  if (req.user.role === 'parent') {
    const parent = await User.findById(req.user.id).lean();
    const isChild = parent?.children?.some((cid) => cid.toString() === id);
    if (!isChild) {
      throw new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403);
    }
  }

  const user = await User.findById(id).lean();
  if (!user || user.role !== 'kid') {
    throw new ApplicationError('Not found', 'NOT_FOUND', 404);
  }
  return res.json({ xp: user.xp, level: user.level, badges: user.badges });
}));

/**
// PUBLIC_INTERFACE
POST /submit-quiz (protected - kid)
Body: { userId, quizId, answers: number[] }
Calculates score, updates Progress, XP/level, badges, rewards.
Returns: { correct, total, xpAwarded, newLevel, newBadges, rewards }
*/
router.post('/submit-quiz', authenticate, authorize(['kid']), asyncHandler(async (req, res) => {
  const { userId, quizId, answers } = req.body || {};
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(quizId) || !Array.isArray(answers)) {
    throw new ApplicationError('Invalid input', 'VALIDATION_ERROR', 400);
  }

  // kids can submit only for themselves
  if (req.user.id !== String(userId)) {
    throw new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403);
  }

  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) {
    throw new ApplicationError('Quiz not found', 'NOT_FOUND', 404);
  }
  const total = quiz.questions.length;
  let correct = 0;
  quiz.questions.forEach((q, idx) => {
    if (answers[idx] === q.answerIndex) correct += 1;
  });
  const score = correct;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Create progress record
  await Progress.create({
    userId,
    quizId,
    score,
    total,
    percentage
  });

  // Update user xp and level with badges
  const user = await User.findById(userId);
  if (!user || user.role !== 'kid') {
    throw new ApplicationError('User not found', 'NOT_FOUND', 404);
  }

  const xpAwarded = correct * XP_PER_CORRECT;
  user.xp += xpAwarded;

  const oldLevel = user.level;
  const newLevel = Math.max(1, Math.floor(user.xp / LEVEL_XP) + 1);
  const newBadges = [];
  if (newLevel > oldLevel) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl += 1) {
      const badge = `Level ${lvl} Achiever`;
      user.badges.push(badge);
      newBadges.push(badge);
    }
    user.level = newLevel;
  }

  await user.save();

  // Rewards update
  let reward = await Reward.findOne({ userId });
  if (!reward) {
    reward = await Reward.create({ userId });
  }
  // Pet stage grows every 2 levels crossed
  if (newLevel > oldLevel) {
    const diff = newLevel - oldLevel;
    const stageIncrements = Math.floor((oldLevel + diff) / 2) - Math.floor(oldLevel / 2);
    reward.petStage += Math.max(0, stageIncrements);
    // Add one sticker per level up (choose randomly but avoid duplicates if possible)
    for (let i = 0; i < diff; i += 1) {
      const candidates = STICKER_POOL.filter(s => !reward.stickers.includes(s));
      const pick = (candidates.length > 0 ? candidates : STICKER_POOL)[Math.floor(Math.random() * (candidates.length > 0 ? candidates.length : STICKER_POOL.length))];
      reward.stickers.push(pick);
    }
    reward.spinAvailable = true;
  }
  // Spin also available if performance excellent
  if (percentage >= 80) {
    reward.spinAvailable = true;
  }
  await reward.save();

  return res.status(201).json({
    correct,
    total,
    xpAwarded,
    newLevel: user.level,
    newBadges,
    rewards: {
      petStage: reward.petStage,
      stickers: reward.stickers,
      spinAvailable: reward.spinAvailable
    }
  });
}));

/**
// PUBLIC_INTERFACE
GET /parent/:id (protected - parent)
Returns aggregated stats for a child id:
{ totalQuizzes, averageScore, lastAttempts: [{ score, total, percentage, timestamp, quizId }] }
*/
router.get('/parent/:id', authenticate, authorize(['parent']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApplicationError('Invalid id', 'VALIDATION_ERROR', 400);
  }

  const parent = await User.findById(req.user.id).lean();
  const isChild = parent?.children?.some((cid) => cid.toString() === id);
  if (!isChild) {
    throw new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403);
  }

  const attempts = await Progress.find({ userId: id })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  const totalQuizzes = await Progress.countDocuments({ userId: id });
  const agg = await Progress.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(id) } },
    { $group: { _id: null, sumScore: { $sum: '$score' }, sumTotal: { $sum: '$total' } } }
  ]);

  const sumScore = agg[0]?.sumScore || 0;
  const sumTotal = agg[0]?.sumTotal || 0;
  const averageScore = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0;

  return res.json({
    totalQuizzes,
    averageScore,
    lastAttempts: attempts.map(a => ({
      score: a.score,
      total: a.total,
      percentage: a.percentage,
      timestamp: a.timestamp,
      quizId: a.quizId
    }))
  });
}));

/**
// PUBLIC_INTERFACE
GET /rewards/:id (protected - kid or parent)
Returns reward state for kid id: { petStage, stickers, spinAvailable }
- Kids can fetch only their own rewards.
- Parent can fetch for a linked child.
*/
router.get('/rewards/:id', authenticate, authorize(['kid', 'parent']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApplicationError('Invalid id', 'VALIDATION_ERROR', 400);
  }

  if (req.user.role === 'kid' && req.user.id !== id) {
    throw new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403);
  }
  if (req.user.role === 'parent') {
    const parent = await User.findById(req.user.id).lean();
    const isChild = parent?.children?.some((cid) => cid.toString() === id);
    if (!isChild) {
      throw new ApplicationError('Forbidden', 'AUTHZ_FORBIDDEN', 403);
    }
  }

  const kid = await User.findById(id).lean();
  if (!kid || kid.role !== 'kid') {
    throw new ApplicationError('Not found', 'NOT_FOUND', 404);
  }

  const reward = await Reward.findOne({ userId: id }).lean();
  if (!reward) {
    return res.json({ petStage: 1, stickers: [], spinAvailable: false });
  }
  return res.json({
    petStage: reward.petStage,
    stickers: reward.stickers,
    spinAvailable: reward.spinAvailable
  });
}));

export default router;
