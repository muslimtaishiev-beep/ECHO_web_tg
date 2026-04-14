import { User, Volunteer } from '../models/db';

export async function getUserByTelegramId(telegramId: number) {
  return await User.findOne({ telegramId });
}

export async function createUser(telegramId: number, isAdmin: boolean = false) {
  const user = new User({ telegramId, isAdmin, language: 'ru' });
  return await user.save();
}

export async function updateLanguage(telegramId: number, language: string) {
  return await User.findOneAndUpdate({ telegramId }, { language }, { new: true });
}

export async function getVolunteerByTelegramId(telegramId: number) {
  return await Volunteer.findOne({ telegramId });
}

export async function createVolunteer(telegramId: number, name: string) {
  const volunteer = new Volunteer({ telegramId, name });
  return await volunteer.save();
}

export async function removeVolunteer(telegramId: number) {
  return await Volunteer.deleteOne({ telegramId });
}
