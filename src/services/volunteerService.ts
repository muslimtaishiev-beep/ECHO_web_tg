import { Volunteer } from '../models/db';

export interface VolunteerType {
  id: string;
  name: string;
  telegramId: number;
  isActive: boolean;
}

export async function getActiveVolunteers(): Promise<any[]> {
  return await Volunteer.find({ isActive: true });
}

export async function getVolunteerByTelegramId(telegramId: number): Promise<any | null> {
  return await Volunteer.findOne({ telegramId, isActive: true });
}

export async function addVolunteer(name: string, telegramId: number): Promise<any> {
  const volunteer = new Volunteer({ name, telegramId });
  return await volunteer.save();
}

export async function removeVolunteer(volunteerId: string): Promise<any> {
  return await Volunteer.findByIdAndUpdate(volunteerId, { isActive: false }, { new: true });
}
