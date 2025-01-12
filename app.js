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
  const waitingMessage = await ctx.reply(
    "Please wait while I fetch your events for the day..."
  );

  try {
    // Fetch today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = await Event.find({
      tgId: id,
      createdAt: { $gte: today, $lte: new Date() },
    });

    if (!events.length) {
      await ctx.deleteMessage(waitingMessage.message_id);
      return await ctx.reply("You haven't logged any events for today. 😊");
    }

    const eventList = events
      .map((event, index) => `${index + 1}. ${event.text}`)
      .join("\n");

    // Remove waiting message and display events
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply(`Here are your events for today:\n\n${eventList}`);
  } catch (error) {
    console.error("Error in /myevents:", error);
    await ctx.deleteMessage(waitingMessage.message_id);
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
    const generatedText = await chat(userQuery);
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply(generatedText);
  } catch (error) {
    console.error("Error in /chat:", error);
    await ctx.deleteMessage(waitingMessage.message_id);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

// Create a map to track users in the process of deleting events
const deleteEventInProgress = {};

// Command to start event deletion
bot.command("deleteevent", async (ctx) => {
  const from = ctx.update.message.from;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  try {
    // Fetch events for the user for today
    const events = await Event.find({
      tgId: from.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (events.length === 0) {
      await ctx.reply("You have no events logged for today to delete. 😊");
      return;
    }

    let eventList = "Here are your events for today:\n\n";
    events.forEach((event, index) => {
      eventList += `${index + 1}. ${event.text}\n`;
    });

    // Ask the user to select an event to delete
    eventList +=
      "\nPlease reply with the number of the event you want to delete, or type 0 to cancel.";

    await ctx.reply(eventList);

    // Store the events and the user ID to track their request
    deleteEventInProgress[from.id] = events;
  } catch (error) {
    console.error("Error fetching events:", error);
    await ctx.reply(
      "Oops! Something went wrong while fetching your events. Please try again later."
    );
  }
});

// Handle text messages
bot.on("text", async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;

  // Check if the user is in the process of deleting an event
  if (deleteEventInProgress[from.id]) {
    const events = deleteEventInProgress[from.id];
    const eventIndex = parseInt(message) - 1; // Convert to zero-based index

    // If the user cancels by typing 0
    if (message === "0") {
      await ctx.reply(
        "Event deletion has been canceled. No events were deleted. 😊"
      );
      deleteEventInProgress[from.id] = undefined; // Remove from the delete process
      return;
    }

    // Validate the event number
    if (isNaN(eventIndex) || eventIndex < 0 || eventIndex >= events.length) {
      await ctx.reply(
        "Invalid event number. Please provide a valid event number from the list."
      );
      return;
    }

    // Proceed to delete the selected event
    try {
      const eventToDelete = events[eventIndex];

      // Delete the selected event
      await Event.deleteOne({ _id: eventToDelete._id });

      await ctx.reply(
        `Event: "${eventToDelete.text}" has been deleted successfully. 🗑️`
      );

      // Remove the user from the delete process
      deleteEventInProgress[from.id] = undefined;
    } catch (error) {
      console.error("Error deleting event:", error);
      await ctx.reply(
        "Oops! Something went wrong while deleting the event. Please try again later."
      );
    }
  } else {
    // If the user is not in delete mode, handle it as a new event
    try {
      await Event.create({
        text: message,
        tgId: from.id,
      });

      await ctx.reply(
        "Got it! 👍 Keep sharing your thoughts with me. When you're ready, just type /generate to create your posts."
      );
    } catch (error) {
      console.error("Error in saving event:", error);
      await ctx.reply("Oops! Something went wrong. Please try again later.");
    }
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
