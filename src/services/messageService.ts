import { Message } from '../models/db';

export async function saveMessage(conversationId: any, senderRole: 'user' | 'volunteer', content: string) {
  const message = new Message({
    conversationId,
    senderRole,
    content
  });
  return await message.save();
}
