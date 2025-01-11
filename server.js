import { Telegraf } from "telegraf";
import connectDB from "./src/config/db.js";
import User from "./src/models/User.js";
import Event from "./src/models/Event.js";
import { generateSocialMediaPosts } from "./src/utils/groqClient.js";

const bot = new Telegraf(process.env.BOT_KEY);

try {
  await connectDB();
} catch (error) {
  console.error("Database connection error:", error);
  process.exit(1);
}


bot.start(async (ctx) => {
  const from = ctx.update.message.from;

  try {
    await User.findOneAndUpdate(
      { tgId: from.id },
      {
        $setOnInsert: {
          firstName: from.first_name,
          lastName: from.last_name,
          isBot: from.is_bot,
          username: from.username,
        },
      },
      { upsert: true, new: true }
    );

    await ctx.reply(
      `Hello ${from.first_name},! 👋 I'm your social media content assistant bot. Log your daily events, and I'll help you create engaging posts tailored for LinkedIn, Facebook, and Twitter. 🎯 Effortless content creation at your fingertips! 🚀 Start by logging your first event. 😊`
    );
  } catch (error) {
    console.error("Error in /start:", error);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

bot.command("generate", async (ctx) => {
  const from = ctx.update.message.from;
  const { message_id: waitingMessageId } = await ctx.reply(
    `Please hold on while I prepare your posts. This won't take long. 😊`
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const events = await Event.find({
      tgId: from.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (events.length === 0) {
      await ctx.deleteMessage(waitingMessageId);
      await ctx.reply(
        "Looks like there are no events logged for today. 🚀 Start by logging your first event. 😊"
      );
      return;
    }

    const generatedText = await generateSocialMediaPosts(events);

    await User.findOneAndUpdate(
      { tgId: from.id },
      {
        $inc: {
          promptToken: generatedText.usage.promptTokens, 
          completionTokens: generatedText.usage.completionTokens,
        },
      }
    );

    await ctx.deleteMessage(waitingMessageId);
    await ctx.reply(generatedText.choices[0]?.message?.content);
  } catch (error) {
    console.error("Error in /generate:", error);
    await ctx.deleteMessage(waitingMessageId);
    await ctx.reply("Oops! Something went wrong. Please try again later.");
  }
});

bot.help((ctx) => {
  ctx.reply(
    "Need assistance? Feel free to reach out to our support team at 12230035.gcit@rub.edu.bt!"
  );
});

bot.on("text", async (ctx) => {
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;

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
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
