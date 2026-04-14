import mongoose from 'mongoose';

// Модели
const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  isAdmin: { type: Boolean, default: false },
  language: { type: String, default: 'ru' }
});

const volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  telegramId: { type: Number, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  status: { type: String, default: 'pending' },
  anonymousId: { type: String, required: true, unique: true },
  topic: { type: String, required: true },
  complexity: { type: String, enum: ['low', 'medium', 'high'] },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderRole: { type: String, enum: ['user', 'volunteer'], required: true },
  content: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  score: { type: Number, min: 1, max: 5, default: null }, // rated by user
  isSatisfied: { type: Boolean, default: null }, // evaluated by volunteer
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const Volunteer = mongoose.model('Volunteer', volunteerSchema);
export const Conversation = mongoose.model('Conversation', conversationSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Review = mongoose.model('Review', reviewSchema);

export async function connectDB(uri: string) {
  try {
    await mongoose.connect(uri);
    console.log('🟢 Connected to MongoDB');
  } catch (error) {
    console.error('🔴 MongoDB connection error:', error);
    process.exit(1);
  }
}