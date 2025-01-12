import express from "express";
import { Telegraf } from "telegraf";
import bodyParser from "body-parser";
import connectDB from "./src/config/db.js";
import User from "./src/models/User.js";
import Event from "./src/models/Event.js";
import { chat, generateSocialMediaPosts } from "./src/utils/groqClient.js";

const app = express();
const bot = new Telegraf(process.env.BOT_KEY);

// Middleware
app.use(bodyParser.json());

// Database Connection
const initializeDatabase = async () => {
  try {
    await connectDB();
    console.log("Database connected successfully.");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

// Set Telegram Webhook
const setWebhook = async () => {
  try {
    const webhookURL = `https://post-writer-telegram-bot.onrender.com/webhook/${process.env.BOT_KEY}`;
    await bot.telegram.setWebhook(webhookURL);
    console.log("Webhook set successfully at:", webhookURL);
  } catch (error) {
    console.error("Error setting webhook:", error);
  }
};

// Telegram Bot Commands
bot.start(async (ctx) => {
  const { id, first_name, last_name, is_bot, username } =
    ctx.update.message.from;

  try {
    await User.findOneAndUpdate(
      { tgId: id },
      {
        $setOnInsert: {
          firstName: first_name,
          lastName: last_name,
          isBot: is_bot,
          username,
        },
      },
      { upsert: true, new: true }
    );
    await ctx.reply(
      `Hello ${first_name}! 👋 I'm your social media content assistant bot. Log your daily events, and I'll help you create engaging posts for LinkedIn, Facebook, and Twitter. Start by logging your first event! 😊`
    );
  } catch (error) {
    console.error("Error in /start:", error);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

bot.command("generate", async (ctx) => {
  const { id } = ctx.update.message.from;
  const waitingMessage = await ctx.reply(
    "Please wait while I prepare your posts..."
  );

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await Event.find({
      tgId: id,
      createdAt: { $gte: today, $lte: new Date() },
    });

    if (!events.length) {
      await ctx.deleteMessage(waitingMessage.message_id);
      return await ctx.reply(
        "No events logged for today. Start by logging your first event! 😊"
      );
    }

    const generatedText = await generateSocialMediaPosts(events);
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply(generatedText.choices[0]?.message?.content);
  } catch (error) {
    console.error("Error in /generate:", error);
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

bot.command("myevents", async (ctx) => {
  const { id } = ctx.update.message.from;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await Event.find({
      tgId: id,
      createdAt: { $gte: today, $lte: new Date() },
    });

    if (!events.length) {
      return await ctx.reply("No events logged for today. 😊");
    }

    const eventList = events
      .map((event, index) => `${index + 1}. ${event.text}`)
      .join("\n");
    await ctx.reply(`Here are your events for today:\n\n${eventList}`);
  } catch (error) {
    console.error("Error in /myevents:", error);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

bot.command("chat", async (ctx) => {
  const { id, first_name } = ctx.update.message.from;
  const messageParts = ctx.message.text.split(" ");
  const userQuery = messageParts.slice(1).join(" ");

  if (!userQuery) {
    return await ctx.reply(
      `Hi ${first_name}, please provide a question or topic after the /chat command. For example: /chat What is the best way to learn programming?`
    );
  }

  const waitingMessage = await ctx.reply(
    "Let me think about that... 🤔 Please hold on."
  );

  try {
    const generatedText = chat(userQuery);
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply(generatedText);
  } catch (error) {
    console.error("Error in /chat:", error);
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

// Handle Text Messages
bot.on("text", async (ctx) => {
  const { id } = ctx.update.message.from;
  const text = ctx.update.message.text;

  try {
    await Event.create({ text, tgId: id });
    await ctx.reply(
      "Got it! 👍 Keep sharing your thoughts. When you're ready, type /generate to create your posts."
    );
  } catch (error) {
    console.error("Error in text handling:", error);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

// Webhook Endpoint
app.post(`/webhook/${process.env.BOT_KEY}`, (req, res) => {
  bot.handleUpdate(req.body);
  res.send("OK");
});

// Graceful Shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Start Server
const startServer = () => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

// Initialize App
(async () => {
  await initializeDatabase();
  await setWebhook();
  startServer();
})();
