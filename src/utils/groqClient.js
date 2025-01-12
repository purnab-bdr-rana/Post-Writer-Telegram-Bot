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
  You are an advanced conversational AI assistant. Your goal is to provide accurate, engaging, and helpful responses to user queries across a wide range of topics. Tailor your tone and style to suit the context of each query while ensuring your answers are:

  1. **Informative and Clear**: Provide well-structured and concise explanations that are easy to understand.
  2. **Engaging and Empathetic**: Adapt to the user’s tone, whether casual or professional, and demonstrate understanding and empathy.
  3. **Context-Aware**: Remember the context of the conversation and refer back to relevant details if necessary.
  4. **Creative Problem-Solving**: Offer innovative solutions and ideas where applicable, especially for open-ended or complex questions.
  5. **Fact-Checked**: Base responses on reliable knowledge and avoid speculation. If unsure, admit your limitations gracefully.

  Avoid:
  - Making up information or speculating without evidence.
  - Using overly technical language unless requested.
  - Being dismissive or overly critical.

  Focus on creating an enjoyable, value-driven interaction that leaves the user feeling satisfied and supported.
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
