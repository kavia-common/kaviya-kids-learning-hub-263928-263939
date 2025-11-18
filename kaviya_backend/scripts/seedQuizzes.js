import 'dotenv/config';
import mongoose from 'mongoose';
import Quiz from '../src/models/Quiz.js';

const seedData = [
  {
    subject: 'math',
    questions: [
      { question: 'What is 2 + 2?', options: ['3', '4', '5', '6'], answerIndex: 1 },
      { question: 'What is 5 - 3?', options: ['1', '2', '3', '4'], answerIndex: 1 },
      { question: 'What is 3 x 3?', options: ['6', '7', '8', '9'], answerIndex: 3 }
    ]
  },
  {
    subject: 'science',
    questions: [
      { question: 'Water freezes at what temperature (°C)?', options: ['0', '10', '50', '100'], answerIndex: 0 },
      { question: 'Which planet is known as the Red Planet?', options: ['Earth', 'Mars', 'Venus', 'Jupiter'], answerIndex: 1 },
      { question: 'Humans breathe in?', options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Helium'], answerIndex: 1 }
    ]
  },
  {
    subject: 'english',
    questions: [
      { question: 'Choose the noun: "The cat runs fast."', options: ['runs', 'fast', 'The', 'cat'], answerIndex: 3 },
      { question: 'Plural of "child" is?', options: ['childs', 'children', 'childes', 'childrens'], answerIndex: 1 },
      { question: 'Opposite of "hot" is?', options: ['warm', 'cold', 'cool', 'heat'], answerIndex: 1 }
    ]
  }
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // eslint-disable-next-line no-console
    console.error('Missing MONGODB_URI env var');
    process.exit(1);
  }
  await mongoose.connect(uri);

  try {
    // Upsert-like behavior: replace existing subjects
    for (const quiz of seedData) {
      await Quiz.findOneAndUpdate({ subject: quiz.subject }, quiz, { upsert: true, new: true, setDefaultsOnInsert: true });
      // eslint-disable-next-line no-console
      console.log(`Seeded quiz: ${quiz.subject}`);
    }
    // eslint-disable-next-line no-console
    console.log('Seeding completed.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', err?.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
