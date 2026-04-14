import { Conversation } from '../models/db';
import crypto from 'crypto';

export async function createConversation(userId: any, topic: string) {
  // Генерируем уникальный анонимный ID
  const anonymousId = `anon_${crypto.randomBytes(4).toString('hex')}`;
  
  const conversation = new Conversation({
    userId,
    anonymousId,
    topic,
    status: 'pending'
  });
  return await conversation.save();
}

export async function assignVolunteer(conversationId: string, volunteerId: string, complexity: string) {
  return await Conversation.findByIdAndUpdate(
    conversationId,
    { volunteerId, status: 'active', complexity },
    { new: true }
  );
}

export async function getPendingConversations() {
  return await Conversation.find({ status: 'pending' })
    .populate('userId')
    .sort({ startedAt: 1 });
}

export async function getActiveConversationForUser(userId: any) {
  return await Conversation.findOne({ userId, status: 'active' }).populate('volunteerId');
}

export async function getActiveConversationForVolunteer(volunteerId: any) {
  return await Conversation.findOne({ volunteerId, status: 'active' }).populate('userId');
}

export async function getConversationById(id: string) {
  return await Conversation.findById(id).populate('userId').populate('volunteerId');
}

export async function endConversation(id: string) {
  return await Conversation.findByIdAndUpdate(id, { status: 'ended', endedAt: new Date() }, { new: true }).populate('userId').populate('volunteerId');
}
