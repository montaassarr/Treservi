import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Analyzes an image for hairstyle recommendations or quality checks.
 * Uses gemini-3-pro-preview for high quality vision analysis.
 */
export const analyzeImage = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const modelId = "gemini-3-pro-preview";

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: "image/jpeg", // Assuming jpeg for simplicity, can be dynamic
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return "Sorry, I couldn't analyze the image at this time. Please check your API key or try again.";
  }
};

/**
 * Handles complex business queries using the Thinking model.
 * Uses gemini-3-pro-preview with thinkingBudget for deep reasoning.
 */
export const askBusinessAdvisor = async (query: string): Promise<string> => {
  try {
    const ai = getAIClient();
    const modelId = "gemini-3-pro-preview"; // Supporting thinking

    const response = await ai.models.generateContent({
      model: modelId,
      contents: query,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768, // Max budget for deep reasoning
        },
      },
    });

    return response.text || "I couldn't generate a strategic response.";
  } catch (error) {
    console.error("Gemini Thinking Error:", error);
    return "Sorry, my thinking process was interrupted. Please try again.";
  }
};
