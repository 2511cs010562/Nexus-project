import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeMentorProfiles(linkedinUrl: string, githubUrl: string, cvUrl: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these professional profiles for a mentor:
      LinkedIn: ${linkedinUrl}
      GitHub: ${githubUrl}
      CV/Resume: ${cvUrl}
      
      Provide a 'Master Rating' from 1.0 to 5.0 based on their perceived expertise, industry experience, and technical contributions.
      Be objective and professional.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: {
              type: Type.NUMBER,
              description: "The calculated master rating from 1.0 to 5.0",
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief explanation for the rating",
            },
          },
          required: ["rating", "reasoning"],
        },
        tools: [{ urlContext: {} }]
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      rating: result.rating || 1.0,
      reasoning: result.reasoning || "Analysis complete."
    };
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback to heuristic if Gemini fails
    let rating = 1.0;
    if (linkedinUrl.includes('linkedin.com')) rating += 1.5;
    if (githubUrl.includes('github.com')) rating += 1.5;
    return { rating, reasoning: "Heuristic fallback used due to analysis error." };
  }
}
