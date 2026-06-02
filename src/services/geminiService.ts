import { UserRole } from "../types";

export async function generateAidAnalysis(patientData: any, role: UserRole) {
  try {
    const response = await fetch("/api/gemini/aid-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patientData, role }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Service Error:", error);
    return "I'm sorry, I'm having trouble processing that right now. Please try again later.";
  }
}

export async function chatWithAssistant(message: string, history: any[], role: UserRole) {
  try {
    const response = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, history, role }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having a bit of trouble connecting to the network. Please try again in a moment.";
  }
}

