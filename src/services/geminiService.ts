import { GoogleGenAI, Type } from "@google/genai";
import { UserRole } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAidAnalysis(patientData: any, role: UserRole) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = role === UserRole.ADMIN 
    ? "You are an expert medical case manager for Cancer Warrior Foundation. Analyze patient records to provide priority tagging recommendations (Critical, High, General) and summaries. Be objective and professional."
    : "You are a helpful assistant for CareConnect, a pediatric cancer support platform. Assist donors in understanding the platform, finding patients to support, and explaining the impact of their contributions. Do not share sensitive medical details.";

  const prompt = role === UserRole.ADMIN
    ? `Analyze this patient case for priority and provide a brief summary: ${JSON.stringify(patientData)}`
    : `Suggest how a donor can help based on these available cases: ${JSON.stringify(patientData)}. Also explain how blockchain ensures transparency.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Service Error:", error);
    return "I'm sorry, I'm having trouble processing that right now. Please try again later.";
  }
}

export async function chatWithAssistant(message: string, history: any[], role: UserRole) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = role === UserRole.ADMIN
    ? `Admin strategic Mode:
       - Help admins analyze donor trends and case prioritization.
       - Focus on operational efficiency and risk management.
       - Provide insights on auction performance and donor retention.`
    : `You are the CareConnect AI Donor Assistant. Your goal is to guide hearts towards helping our Cancer Warriors.
       
       CORE KNOWLEDGE & POLICIES:
       1. DONATION PROCESS:
          - Step 1: Browse "Warriors" (Patients) and select a profile.
          - Step 2: Click "Secure Donation".
          - Step 3: Pay via GCash using the Foundation QR code.
          - Step 4: Upload your GCash receipt/proof for internal audit.
          - Step 5: Once verified, notice your impact recorded on the Polygon blockchain.
          
       2. GCASH GUIDANCE:
          - Use the GCash app to scan the QR code in our portal.
          - Ensure you save the transaction receipt as it is required for on-chain verification.
          
       3. AUCTION PARTICIPATION:
          - We host high-value asset auctions (Art, Memorabilia).
          - Bids are records as smart contract interactions.
          - Winners complete payment via GCash, and once treasury verifies, the asset acquisition is recorded permanently.
          
       4. BLOCKCHAIN (POLYGON POS):
          - We use blockchain for 100% transparency.
          - Every verified donation is logged with a txHash (Transaction Hash).
          - This ensures that 100% of your funds go strictly to the treatment plan.
          
       5. LOYALTY (WARRIOR PATH):
          - Bronze Champion: Entry tier.
          - Silver Champion: 10k PHP milestone.
          - Gold Champion: 50k PHP milestone.
          - Platinum Champion: 200k PHP milestone.
          - Streaks: Donors who give monthly maintain an "Action Streak".
          - Retention Strategy: 
            - If a donor is close to the next tier, gently mention it.
            - If they have a streak, celebrate it as "uninterrupted support for the warriors".
            - Tier benefits include exclusive access to limited charity auctions and digital heritage badges.
          
       RESTRICTIONS:
       - NEVER disclose actual patient full names or sensitive medical records if they are not in the current context.
       - NEVER provide internal analytics or admin-only data to donors.
       - Use only public-facing platform features.
       
       TONE: Heartfelt, transparent, tech-forward, and empowering.`;

  try {
    const chat = ai.chats.create({
      model,
      config: { 
        systemInstruction,
        temperature: 0.7,
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having a bit of trouble connecting to the network. Please try again in a moment.";
  }
}
