import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateSocialMediaPosts = async (events) => {
  const systemPrompt = `
    Act as a senior copywriter with a focus on crafting engaging and impactful social media content. You will create posts for LinkedIn, Facebook, and Twitter using the provided thoughts or events throughout the day. Tailor your writing to the specific tone and audience of each platform.
  `;

  const prompt = `
    Write three distinct, engaging social media posts—one for LinkedIn, one for Facebook, and one for Twitter. Each post should be tailored to the respective platform's audience and use a conversational, approachable tone. Focus on making each post impactful, encouraging interaction, and driving interest in the events listed below. 

    Use the provided time labels only to understand the sequence of events, but do not mention time in the posts. Keep the language simple and clear, while emphasizing the most important points from the events. Ensure each post creatively highlights the key events and is crafted with the platform's audience in mind:

    ${events.map((event) => event.text).join(", ")}
  `;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    model: "llama-3.3-70b-versatile",
  });

  return chatCompletion.choices[0]?.message?.content;
};

export { generateSocialMediaPosts };
