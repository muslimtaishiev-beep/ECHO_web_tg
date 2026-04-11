import { Review } from '../models/db';

export async function createReview(userId: any, volunteerId: any, conversationId: any) {
  const r = new Review({ userId, volunteerId, conversationId });
  return await r.save();
}

export async function updateReviewVolunteerSatisfaction(conversationId: any, isSatisfied: boolean) {
  return await Review.findOneAndUpdate({ conversationId }, { isSatisfied }, { new: true });
}

export async function updateReviewUserScore(conversationId: any, score: number) {
  return await Review.findOneAndUpdate({ conversationId }, { score }, { new: true });
}
