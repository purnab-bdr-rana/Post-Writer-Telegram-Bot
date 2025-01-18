# Post Writer Telegram Bot

Post Writer is a Telegram bot designed to automate the process of creating social media posts for LinkedIn, Facebook, and X (Twitter) based on events logged throughout the day. In addition, the bot features an AI-powered chat functionality that provides AI-generated responses for queries. This bot simplifies the content creation process and enhances social media engagement.

## Features

- **Social Media Posts Generation**: 
  - Automatically generates posts for LinkedIn, Facebook, and X (Twitter) based on events logged during the day.
  - Customizable templates for each social media platform.
  
- **AI-Powered Chat**:
  - Engage in a chat with the bot to get AI-generated answers on various topics.

## Technologies Used

- **Telegram Bot API**: To interact with users via Telegram.
- **Groq api (or similar AI model)**: For generating AI-powered responses.
- **Node.js / Python**: Backend logic for processing events and interacting with APIs.
- **MongoDB**: For storing user data and logged events.

## Setup Instructions

Follow the steps below to set up the **Post Writer** Telegram bot locally:

### Prerequisites

- Node.js installed
- A Telegram bot token (create one via [BotFather](https://core.telegram.org/bots#botfather))
- Qroq Api (create one via [Qroq](https://groq.com/))
- MongoDB database.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/purna-bdr-rana/Post-Writer-Telegram-Bot.git
   cd Post-Writer-Telegram-Bot
   
2. Install dependencies:

   ```bash
   npm install
 
3. Create a .env file in the root directory and add your bot token and qroq API keys:

   ```bash
   BOT_KEY=your-telegram-bot-token
   MONGO_CONNECT_STRING=your-mongoDb-connecting-string
   GROQ_API_KEY=your-qroq-api-key
 
4. Run the bot:

   ```bash
   npm run dev


