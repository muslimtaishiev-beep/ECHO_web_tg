# Telegram Bot Verification Guide

Follow these steps to ensure your Telegram bot and backend server are correctly configured and fully functional.

## 1. Startup Verification
Start your server from the `ECHO/server` directory using your preferred command (e.g., `npm run start:dev`). Look for these specific success messages in your console:

*   **Database**: `🟢 [DATABASE] Successfully connected to PostgreSQL.`
*   **Telegram**: `🤖 [TELEGRAM] Bot [@YourBotName] is ONLINE and ready.`

> [!WARNING]
> If you see `⚠️ [TELEGRAM] Bot is DISABLED`, it means the token in your `.env` is either missing or still set to the placeholder.

---

## 2. Testing the Teenager (User) Flow
1.  **Start the Bot**: Open your bot in Telegram and send `/start`.
2.  **Language**: Select your language (English or Russian).
3.  **Create Request**: Click the **"Share your story"** (or command `/request`) button.
4.  **Enter Topic**: The bot should ask "What's on your mind?". Type a test message like "Feeling stressed about exams".
5.  **Queue**: The bot should reply that your request is created and we are looking for a volunteer.

---

## 3. Testing the Volunteer Flow
1.  **Register as Volunteer**: (If not already one) You can use the Admin panel in the web UI or the `/volunteer` command if your ID is already in the DB.
2.  **View Requests**: Send `/chats` or `/view_requests`. 
3.  **Accept Chat**: You should see your teenager request. Click **"Accept"**.
4.  **Complexity**: Select a complexity level (Low/Medium/High).
5.  **Chatting**: Send a message. In the teenager's chat, they should see your message. Reply from the teenager's side; the volunteer should receive it.

---

## 4. Testing Admin Features
1.  **Status**: Send `/admin`.
2.  **Stats**: Click **"View Stats"**.
3.  **Output**: The bot should return a summary of total users, active chats, and messages in the system.

---

## 5. Ending the Chat
1.  **Volunteer End**: Send `/end`. The bot will ask if the user is satisfied. Select "Yes" or "No".
2.  **Teenager Rating**: The teenager should receive a notification that the chat has ended and be prompted to rate the experience (1-5 stars).

> [!TIP]
> **Debugging**: If messages are not being delivered between the user and volunteer, check that both have no other active chats and that the "Focus" (🎯) is correctly set on the volunteer's side (use `/chats` to verify).

---

## 6. Local Development Quickstart

If you want to run the project locally on your machine alongside Railway:

1.  **Install Dependencies**: Run `npm run install:all` in the root directory.
2.  **Start Database**: Ensure Docker Desktop is running, then run `npm run db:up` from the root.
3.  **Setup Environment**: 
    *   Copy `ECHO/server/.env.example` to `ECHO/server/.env`.
    *   Update `DATABASE_URL` in `ECHO/server/.env` to the local Docker URL provided in the comments.
4.  **Sync Database**: Run `npm run prisma:push` to create tables in your local database.
5.  **Start All**: Run `npm run dev` to start both the Frontend and Backend simultaneously.

Your app will be available at:
*   **Web UI**: `http://localhost:5173`
*   **API**: `http://localhost:3000`

