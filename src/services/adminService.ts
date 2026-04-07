import { User, Volunteer, Conversation, Message } from '../models/db';

export async function getStats() {
  const usersCount = await User.countDocuments();
  const volunteersCount = await Volunteer.countDocuments();
  const activeConversations = await Conversation.countDocuments({ status: 'active' });
  const pendingConversations = await Conversation.countDocuments({ status: 'pending' });
  const totalMessages = await Message.countDocuments();

  return {
    usersCount,
    volunteersCount,
    activeConversations,
    pendingConversations,
    totalMessages
  };
}
