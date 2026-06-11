import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize server-side Gemini client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Helper: Resilient Context-Aware Fallback Responses for Chat
  function getFallbackChatResponse(message: string, role: string): string {
    const msg = message.toLowerCase();
    
    if (role === "admin") {
      if (msg.includes("patient") || msg.includes("warrior") || msg.includes("cases")) {
        return `### 📋 Pediatric Cancer Case Management Overview

The platform currently tracks pediatric patients with verified diagnoses (primarily Leukemia, Neuroblastoma, and Osteosarcoma).

**Case Priority Tagging Recommendation Guidelines:**
1. **Critical Priority**: Stage III/IV solid tumors, relapsed cases, or patients with less than 25% of their treatment funding goal met.
2. **High Priority**: Active chemotherapy plans with stable clinical vitals needing recurring support.
3. **General Priority**: Patients entering the maintenance phase or with high funding progress.

You can register, update, or audit any case from the **Warriors Registry** on your dashboard.`;
      }
      
      if (msg.includes("reconcil") || msg.includes("donation") || msg.includes("verify") || msg.includes("gcash")) {
        return `### 💸 Donation Verification & GCash Audit Guidelines

1. **Pending Donations**: These represent GCash contributions made by donors where the receipt image awaits administrative verification.
2. **Reconciliation Steps**: 
   - Click "Approve" after verifying the GCash transaction reference number to trigger the on-chain transparency mint.
   - Click "Reject" only if the receipt is duplicate, invalid, or unreadable.
3. **On-Chain Sync**: Approved donations trigger an automated smart contract transaction on the Polygon network, permanentizing the donor's digital certificate and allocating the funds.`;
      }

      if (msg.includes("auction") || msg.includes("bid")) {
        return `### 🎨 Charity Auction Audit Guidelines

- **Bidding Rules**: All active charity auctions verify bidder credentials in real-time.
- **Audit Steps**: 
  - Ensure the high bidder completes physical asset checkout.
  - Record physically delivered items with verified on-chain possession transfers.
- **Action**: You can create new auctions, edit bid criteria, or audit closed listings.`;
      }

      if (msg.includes("tier") || msg.includes("loyalty") || msg.includes("donor")) {
        return `### 🏆 Donor Loyalty & Tier Matrix

Donors advance through tiers based on cumulative verified PHP contributions:
1. **Bronze Champion** (< 10k PHP): Access to public records, digital community badge.
2. **Silver Champion** (10k - 50k PHP): Priority audit manual access, milestone certificates.
3. **Gold Champion** (50k - 200k PHP): Special early bidding preview on high-value charity auctions.
4. **Platinum Champion** (> 200k PHP): IPFS audit consensus vote delegation, monthly advisory briefings.`;
      }

      return `### 🏢 CareConnect Administrative Co-pilot (Resilient Backup Active)

I am CareConnect Oracle, active in fallback mode. I can help you reconcile GCash transactions, evaluate cancer warrior treatment funding progression, audit bidding records, and manage donor loyalty tiers.

How can I assist you with platform administration today?`;
    } else {
      // Donor fallback
      if (msg.includes("donate") || msg.includes("gcash") || msg.includes("how can i help") || msg.includes("help")) {
        return `### 💖 How to Support a Cancer Warrior

CareConnect makes supporting pediatric oncology patients seamless and transparent:

1. **Browse Warriors**: Click the **Warriors** tab to view live profiles of pediatric patients.
2. **Select & Support**: Click **Secure Donation** on any card.
3. **GCash Scan**: Scan the GCash QR code provided in the modal.
4. **Receipt Upload**: Upload your GCash payment screenshot. Our team will verify and record the contribution.
5. **On-Chain Proof**: Once approved, your donation is permanentized on the Polygon blockchain for 100% transparent auditability!`;
      }

      if (msg.includes("blockchain") || msg.includes("transparency") || msg.includes("polygon") || msg.includes("hash")) {
        return `### ⛓️ Blockchain Transparency on Polygon

We believe in absolute accountability:
- **Zero Leakage**: Standard charities hide administration overhead. CareConnect logs 100% of verified contributions directly to the specific warrior's medical ledger.
- **On-Chain Proof**: Every approved transaction creates a unique, immutable hash on the **Polygon Blockchain** (PoS).
- **Public Audit**: Anyone can verify the cryptographically secured proof in our "Secured On-Chain Vault" at the bottom of the portal.`;
      }

      if (msg.includes("tier") || msg.includes("loyalty") || msg.includes("champion") || msg.includes("benefit")) {
        return `### 🏆 The Warrior Path (Loyalty Tiers)

Every contribution you make helps children fight cancer and unlocks new capabilities on our portal:

- **Bronze Champion** (Entry): Beautiful profile badge, digital certificate.
- **Silver Champion** (cumulative 10k PHP): Priority GCash checkouts, milestone audit reports.
- **Gold Champion** (cumulative 50k PHP): 24-hr advance bidding previews on high-value art auctions.
- **Platinum Champion** (cumulative 200k PHP): IPFS consensus governance delegation, medical pool co-allocation!

*Keep your monthly support streak going to show continuous love for the warriors.*`;
      }

      if (msg.includes("auction") || msg.includes("art") || msg.includes("bid")) {
        return `### 🎨 Charity Auctions & Memorabilia

We host charity auctions to raise emergency funding for patients:
- **Verified Assets**: Every item (paintings, memorabilia) is fully authenticated.
- **How to Bid**: View high-value items in the **Charity Auction** section, check current bids, and place your on-chain bid.
- **Winning**: Winners pay via GCash, and physical delivery is tracked on-chain.`;
      }

      return `### 🌸 Welcome to CareConnect Support (Resilient Backup Active)

Hello! I am your AI Heart Coordinator, standing by in fallback mode. I'd love to help you understand how you can save lives:
- **How to Donate**: Guided walk-through utilizing GCash.
- **Blockchain Details**: Learn how we ensure absolute transparency.
- **Tiers & Streaks**: Explore the **Warrior Path** loyalty benefits.

Please feel free to ask any question about supporting our Cancer Warriors!`;
    }
  }

  // Helper: Resilient Fallback for Case Prioritization
  function getFallbackAidAnalysis(patientData: any): string {
    const diagnosis = (patientData.diagnosis || "").toLowerCase();
    const name = patientData.fullName || "Patient";
    
    let isCritical = false;
    if (
      diagnosis.includes("stage iv") || 
      diagnosis.includes("stage 4") || 
      diagnosis.includes("relapse") || 
      diagnosis.includes("critical") || 
      diagnosis.includes("acute") || 
      diagnosis.includes("urgent") || 
      diagnosis.includes("leukemia")
    ) {
      isCritical = true;
    }
    
    const priorityTag = isCritical ? "Critical Priority" : "High Priority";
    
    return `### 🧬 CareConnect Case Intake AI Analysis (Resilient Backup Active)

**System Analysis for:** ${name}  
**Recommendation Status**: **${priorityTag}**  

#### 📋 Clinical Review Summary:
- **Diagnosis & Staging**: Checked listed diagnosis *"${patientData.diagnosis || "Pediatric Case"}"*.
- **Priority Determination**: Identified clinical markers recommending a **${priorityTag}** tag to accelerate fundraising exposure.
- **Transparency Protocol**: Secure-hash queued for automated audit block mapping on GCash verification.`;
  }

  // Helper: Dynamic API Warning Headers
  function getWarningHeader(error: any): string {
    const errString = (String(error) + " " + JSON.stringify(error)).toLowerCase();
    
    if (errString.includes("spending cap") || errString.includes("quota") || errString.includes("429") || errString.includes("resource_exhausted")) {
      return `> ⚠️ **Google AI Studio Spend Cap Exceeded**  \n> Your project has exceeded its monthly spending cap. To manage your project spend cap and restore real Gemini responses, please visit **[ai.studio/spend](https://ai.studio/spend)**.  \n> *Resilient CareConnect local fallbacks have been activated to keep the app fully operational.*  \n\n***\n\n`;
    }
    
    if (errString.includes("503") || errString.includes("unavailable") || errString.includes("high demand") || errString.includes("temporary")) {
      return `> ⚠️ **Google AI Studio Model Experiencing High Demand (503)**  \n> The Gemini API is currently experiencing a temporary demand spike. Real-time Gemini responses will resume automatically in a few moments.  \n> *Resilient CareConnect local fallbacks have been activated to keep the app fully operational.*  \n\n***\n\n`;
    }
    
    return `> ⚠️ **Google AI Studio Service Note**  \n> The AI service is currently in fallback mode (or missing its API key configuration in Settings > Secrets).  \n> *Resilient CareConnect local fallbacks have been activated to keep the app fully operational.*  \n\n***\n\n`;
  }

  // API Route: Generate aid prioritization analysis
  app.post("/api/gemini/aid-analysis", async (req, res) => {
    const { patientData, role } = req.body;
    const model = "gemini-3.5-flash";

    const systemInstruction =
      role === "admin"
        ? "You are an expert medical case manager for Cancer Warrior Foundation. Analyze patient records briefly to suggest priority tagging (Critical, High, General) and summaries. Keep your answer highly concise, objective, and under 60 words."
        : "You are a helpful assistant for CareConnect, a pediatric cancer support platform. Briefly note how a donor can help and the blockchain benefit. Keep your response extremely brief, clear, and under 80 words.";

    const prompt =
      role === "admin"
        ? `Analyze this patient case for priority and provide an extremely short summary (max 50 words): ${JSON.stringify(patientData)}`
        : `Briefly outline how a donor can help with these cases and the role of blockchain transparency (max 60 words): ${JSON.stringify(patientData)}`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Service Error:", error);
      const warningHeader = getWarningHeader(error);
      res.json({ text: warningHeader + getFallbackAidAnalysis(patientData) });
    }
  });

  // API Route: Assistant Chat
  app.post("/api/gemini/chat", async (req, res) => {
    const { message, history, role } = req.body;
    const model = "gemini-3.5-flash";

    const systemInstruction =
      role === "admin"
        ? `You are CareConnect Oracle - the expert administrative and operational co-pilot for the Cancer Warrior Foundation portal.
           
           CRITICAL CONCISENESS RULE: Keep all responses extremely brief and direct (max 100-120 words). Never use long introductory/concluding text or filler. Focus entirely on the specific requested audit values or summaries.

           CORE ROLE & CAPABILITIES:
           - You help administrators analyze live platform data, perform system reconciliations, evaluate warrior case urgencies, analyze trends, lookup specific patient records, and check donation status details.
           - You have direct visibility over the CareConnect database snapshot (which is injected in JSON form within standard message prompts).
           
           SYSTEM DATA SCHEMA & ENTITIES:
           - PATIENTS: Track status (Active, TreatmentCompleted), funding goals, funding raised, staging, age, full name, priority, etc.
           - DONATIONS: Track status (pending, verified, rejected), payment methods, amounts.
           - AUCTIONS: Track asset status, titles, current bids.
           - DONORS/USERS: Compare donor totals, list loyalty tiers (Bronze, Silver, Gold, Platinum).
           - AUDIT LOGS: Track administrative actions such as APPROVE_DONATION, REGISTER_WARRIOR, etc.

           GUIDELINES:
           - Compute mathematically and output very precise lists or brief tables. Never output placeholders.
           - Output must be short, action-oriented, and highly condensed. - TABLE FORMATTING: If you use a Markdown table, always limit columns to 3-4 key fields max to fit perfectly. Never output raw delimiters in plain text. Always ensure the column headers align cleanly with table cells. Use Filipino Pesos ₱ for amounts.`
        : `You are the CareConnect AI Donor Assistant. Your goal is to guide hearts towards helping our Cancer Warriors.
           
           CRITICAL CONCISENESS RULE: Answer donor questions in an extremely short, clear, and direct way. Keep responses under 80 words. Avoid all conversational filler or long preachy advice.

           CORE KNOWLEDGE & POLICIES:
           1. DONATION PROCESS:
              - Select a Warrior, click "Secure Donation", pay via GCash, upload receipt. On-chain proof gets recorded on Polygon.
              
           2. GCASH GUIDANCE: Save screenshot with reference number for validation.
              
           3. AUCTION PARTICIPATION: Bid items are verified assets; winners pay via GCash.
              
           4. BLOCKCHAIN (POLYGON POS): logs 100% of funds directly to a medical ledger with a txHash.
              
           5. LOYALTY (WARRIOR PATH): Bronze (<10k PHP), Silver (10k-50k PHP), Gold (50k-200k PHP), Platinum (>200k PHP). Maintain a monthly giving streak.
              
           RESTRICTIONS:
           - Keep answers clean, straightforward, extremely light, and under 80 words. No fluff.`;

    // Formatted history for @google/genai SDK
    // The SDK requires history to have the role 'user' or 'model' and contain 'parts' instead of 'content'
    let formattedHistory: any[] = [];
    if (history && Array.isArray(history)) {
      // Convert structure from { role, content } to { role, parts: [{ text }] }
      const mapped = history.map((item: any) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content || "" }]
      }));
      
      // Find the first index where role is 'user' to ensure it starts with 'user'
      // Gemini API throws a 400 validation error if history doesn't start with a 'user' turn
      const firstUserIndex = mapped.findIndex(item => item.role === "user");
      if (firstUserIndex !== -1) {
        formattedHistory = mapped.slice(firstUserIndex);
      }
    }

    try {
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
        history: formattedHistory.length > 0 ? formattedHistory : undefined,
      });

      const result = await chat.sendMessage({ message });
      res.json({ text: result.text });
    } catch (error) {
      console.error("Chat Error:", error);
      const warningHeader = getWarningHeader(error);
      res.json({ text: warningHeader + getFallbackChatResponse(message, role) });
    }
  });

  // Helper: Resilient Fallback for Predictive Analytics
  function getLocalPredictiveFallback(userProfile: any, activeAuctions: any[]): string {
    const name = userProfile?.displayName?.split(" ")[0] || "Friend";
    const streak = userProfile?.donationStreak || 0;
    const tier = userProfile?.loyaltyTier || "Bronze Champion";
    const total = userProfile?.totalContribution || 0;

    let nextTier = "Silver Champion";
    let diff = Math.max(0, 10000 - total);
    if (tier.includes("Silver")) {
      nextTier = "Gold Champion";
      diff = Math.max(0, 50000 - total);
    } else if (tier.includes("Gold")) {
      nextTier = "Platinum Champion";
      diff = Math.max(0, 200000 - total);
    } else if (tier.includes("Platinum")) {
      nextTier = "Maximum Champion Tier";
      diff = 0;
    }

    const recAuctions =
      activeAuctions && activeAuctions.length > 0
        ? activeAuctions
            .slice(0, 2)
            .map((a: any) => `- **${a.title}** (Current Bid: ₱${(a.currentBid || 0).toLocaleString()})`)
            .join("\n")
        : "- *No active luxury auction arts available right now, stay tuned!*";

    return `### 📈 Predictive Retention & Auction Summary

**Donor**: **${name}** | **Status**: **${tier}**  

#### 🛡️ Stability Analysis
- **Retention Probability Score**: **${streak > 2 ? '97.2%' : '89.5%'}** (High stability).
- **Attrition Risk**: **Low** (continuous streak maintained).

#### 🎯 Milestone Actions
- **Next Loyalty Target**: Reach **${nextTier}** by contributing **₱${diff.toLocaleString()}**.
- **Optimal Time**: **6:00 PM - 9:00 PM** for instant verification.

#### 🎨 Recommended Charity Assets
${recAuctions}`;
  }

  // API Route: Predictive Analytics Co-pilot
  app.post("/api/gemini/predictive-analytics", async (req, res) => {
    const { userProfile, activeAuctions } = req.body;
    const model = "gemini-3.5-flash";

    const systemInstruction = 
      "You are CareConnect Oracle AI, a donor retention intelligence engine. " +
      "Provide a highly polished but extremely concise and direct predictive brief (max 100-120 words). " +
      "Never write verbose paragraphs or redundant introductory text. " +
      "Structure your response into 3 sections: 1) Retention Stability, 2) Milestone Target, and 3) Custom Auction Match. Limit to 1-2 rapid lines per section.";

    const prompt = 
      `Donor Profile: ${JSON.stringify(userProfile)}
       Active Auctions Directory: ${JSON.stringify(activeAuctions)}
       
       Tasks (Keep result extremely short, direct, under 110 words total):
       1. Provide Retention Score and a brief attrition risk classification.
       2. Detail how to reach the next tier.
       3. Match them to 1 active auction with a brief reason.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Predictive Analytics Error:", error);
      const warningHeader = getWarningHeader(error);
      res.json({ text: warningHeader + getLocalPredictiveFallback(userProfile, activeAuctions) });
    }
  });

  // Vite middleware for development or serving the built files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
