import OpenAI from "openai";
import { config } from "dotenv";
config();

const openai = new OpenAI();

export async function promptLLM(prompt) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0,
      top_p: 1,
      max_tokens: 70,
      messages: prompt,
    });
  

    let text = '';
    for await (const chunk of stream) {
     
        const chunk_message = chunk?.choices[0]?.delta?.content;
        if (chunk_message) {
          text += chunk_message;
        }
      
    }
   
    return text;
}