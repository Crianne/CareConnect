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
        ? "You are an expert medical case manager for Cancer Warrior Foundation. Analyze patient records to provide priority tagging recommendations (Critical, High, General) and summaries. Be objective and professional."
        : "You are a helpful assistant for CareConnect, a pediatric cancer support platform. Assist donors in understanding the platform, finding patients to support, and explaining the impact of their contributions. Do not share sensitive medical details.";

    const prompt =
      role === "admin"
        ? `Analyze this patient case for priority and provide a brief summary: ${JSON.stringify(patientData)}`
        : `Suggest how a donor can help based on these available cases: ${JSON.stringify(patientData)}. Also explain how blockchain ensures transparency.`;

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
           
           CORE ROLE & CAPABILITIES:
           - You help administrators analyze live platform data, perform system reconciliations, evaluate warrior case urgencies, analyze trends, lookup specific patient records, and check donation status details.
           - You have direct visibility over the CareConnect database snapshot (which is injected in JSON form within standard message prompts).
           
           SYSTEM DATA SCHEMA & ENTITIES:
           - PATIENTS: Track status (Active, TreatmentCompleted), funding goals, funding raised (calculate percentages like fundingRaised/fundingGoal * 100, identify stalled funds), staging, age, full name, priority, etc.
           - DONATIONS: Track status (pending, verified, rejected), payment methods (Gcash, card, crypto), amounts (sum them to calculate totals). A pending donation represents a GCash contribution waiting for the admin to confirm proof of payment.
           - AUCTIONS: Track asset status (draft, audit, active, closed), titles, current bids.
           - DONORS/USERS: Compare donor totals, list loyalty tiers (Bronze, Silver, Gold, Platinum).
           - AUDIT LOGS: Track administrative actions such as APPROVE_DONATION, REGISTER_WARRIOR, etc.

           GUIDELINES:
           - When asked to count, aggregate, filter, calculate statistics, or look up details, perform the computation mathematically and output precise lists or answers. Never output placeholders.
           - Be professional, highly analytical, objective, and action-oriented.
           - Format your response with beautiful, bold Markdown tables, scannable bullet points, or numerical breakdowns. Avoid long unstructured blocks of text.
           - Help the administrator make fast, informed choices about patient payouts, bid audits, user retention strategies, and GCash reconciliation.`
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
              - Bronze Champion: Entry tier. Unlocks community contributor badges and basic AI assistant.
              - Silver Champion: 10k PHP milestone. Unlocks GCash audit manual acceleration and exclusive auditing sheets.
              - Gold Champion: 50k PHP milestone. Unlocks 24-hr early bidding previews on auctions and monthly advisory briefs.
              - Platinum Champion: 200k PHP milestone. Unlocks IPFS consensus vote delegation and emergency medicine pool co-allocation.
              - Streaks: Donors who give monthly maintain an "Action Streak".
              - Retention Strategy: 
                - If a donor is close to the next tier, gently mention it.
                - If they have a streak, celebrate it as "uninterrupted support for the warriors".
                - Tier benefits progress sequentially from basic digital contributor badges up to IPFS on-chain audit consensus governance rights.
              
           RESTRICTIONS:
           - NEVER disclose actual patient full names or sensitive medical records if they are not in the current context.
           - NEVER provide internal analytics or admin-only data to donors.
           - Use only public-facing platform features.
           
           TONE: Heartfelt, transparent, tech-forward, and empowering.`;

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
