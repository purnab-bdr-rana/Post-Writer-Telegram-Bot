import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateSocialMediaPosts = async (events) => {
  const systemPrompt = `
  Act as a senior copywriter with expertise in crafting engaging and impactful social media content. Your role is to write tailored posts for LinkedIn, Facebook, and Twitter, adapting the tone and style for each platform's audience.
`;

  const prompt = `
  Create three distinct, engaging social media posts—one for LinkedIn, one for Facebook, and one for Twitter. Each post must:
  
  - Be tailored to the specific platform's tone and audience:
    - LinkedIn: Professional and insightful to engage industry professionals.
    - Facebook: Casual and relatable to appeal to a broad audience.
    - Twitter: Concise and witty to spark immediate interaction.
  
  - Focus on making each post impactful and encouraging engagement (e.g., through questions, hashtags, or calls-to-action).
  
  - Highlight the key points from the events below. Use the provided time labels only to understand the sequence of events but do not include them in the posts.
  
  - Keep language simple, clear, and engaging. Avoid redundancy across platforms while maintaining creativity.

  Here are the events:
  ${
    events.length > 0
      ? events.map((event) => `- ${event.text}`).join("\n")
      : "No events provided. Create posts based on trending topics."
  }
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    model: "llama-3.3-70b-versatile",
  });

  return chatCompletion;
};

const chat = async (query) => {
  const systemPrompt = `
  You are an advanced conversational AI assistant. Your goal is to provide accurate, engaging, and helpful responses to user queries across a wide range of topics. When formatting responses, ensure that:

  1. Lists are presented in plain text without Markdown-style formatting (e.g., avoid using ** for bold).
  2. Proper spacing is maintained for readability.
  3. Responses are clear, concise, and free from unnecessary symbols or formatting unless explicitly requested by the user.

  Avoid:
  - Markdown formatting in lists or emphasis unless explicitly requested.
  - Overly technical or verbose explanations unless the context demands it.
  - Speculation or unsupported information.

  Focus on delivering a straightforward and easy-to-read response that aligns with the user's query.
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return (
      chatCompletion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response."
    );
  } catch (error) {
    console.error("Error in chat function:", error);
    throw new Error("Failed to process the chat request.");
  }
};

export { generateSocialMediaPosts, chat };
