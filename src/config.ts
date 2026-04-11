import dotenv from 'dotenv';
dotenv.config();

export const BOT_TOKEN = process.env.BOT_TOKEN!;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/echodb';
export const PORT = parseInt(process.env.PORT || '3000');
export const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : undefined;
