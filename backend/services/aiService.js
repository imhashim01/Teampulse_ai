// Single server-side AI entry point for Risk Radar.
// Only computed signals + check-in text are sent. The model must pick evidence from a fixed list
// of fact IDs, so it cannot invent facts. On missing key / error / invalid JSON the caller falls
// back to the rule engine ("Rule-based").
import { RISK_CATEGORIES } from "./riskEngine.js";

const TIMEOUT_MS = 15000;
const LEVELS = ["Low", "Medium", "High"];

const SYSTEM_PROMPT = `You are TeamPulse, a supportive assistant for a team lead in Pakistan.
You compare what a team member reports with what the task records show, and help the lead offer support early.
This is support, not surveillance.

Rules:
- Use ONLY the facts and check-in text provided. Never invent numbers, dates, events or quotes.
- "evidence" must be an array of fact IDs copied from the provided facts list. No other values.
- Never infer emotions, burnout, stress or mental state. Never mention working hours or late-night activity.
- "Workload strain" is only allowed if the facts say the member explicitly reported being overloaded.
- If the data is thin, use category "Insufficient evidence" and never level "High".
- "supportiveMessage" is a WhatsApp message the lead can send: friendly, non-blaming, mixing Roman Urdu and English,
  1-2 sentences, addressed to the member by first name, offering help (e.g. a short call). Example style:
  "Ali, payment API wala kaam tricky lag raha hai, 15 minute call kar lein? Saath mein dekh lete hain."
- Respond with JSON only, matching:
{"category": one of ${JSON.stringify(RISK_CATEGORIES)},
 "level": "Low"|"Medium"|"High",
 "explanation": string (max 2 sentences, for the lead),
 "evidence": [fact IDs],
 "deadlineRisk": string (short),
 "suggestedAction": string (one concrete action for the lead),
 "supportiveMessage": string}`;

const buildUserPrompt = ({ memberName, taskTitle, signals, facts, ruleResult }) => JSON.stringify({
    member: memberName,
    task: taskTitle,
    signals,
    facts: facts.map(({ id, text }) => ({ id, text })),
    ruleEngineSuggestion: { category: ruleResult.category, level: ruleResult.level },
});

// ---- Provider adapters: each returns the raw model text ----
const providers = {
    gemini: async ({ system, user, signal }) => {
        const model = process.env.AI_MODEL || "gemini-2.5-flash";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: "user", parts: [{ text: user }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
            }),
            signal,
        });
        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    },
    // OpenAI-compatible (OpenAI, Groq): set AI_PROVIDER=openai|groq, AI_API_KEY, AI_MODEL
    openai: async ({ system, user, signal }) => {
        const base = process.env.AI_BASE_URL || (process.env.AI_PROVIDER === "groq"
            ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
        const res = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
            body: JSON.stringify({
                model: process.env.AI_MODEL,
                temperature: 0.3,
                response_format: { type: "json_object" },
                messages: [{ role: "system", content: system }, { role: "user", content: user }],
            }),
            signal,
        });
        if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
        const data = await res.json();
        return data?.choices?.[0]?.message?.content || "";
    },
};

const providerName = () => {
    const p = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    return p === "groq" ? "openai" : p;
};

export const isAIConfigured = () =>
    providerName() === "gemini" ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.AI_API_KEY);

const str = (v, max = 600) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

const validate = (raw, facts, ruleResult) => {
    const parsed = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim());
    const category = RISK_CATEGORIES.includes(parsed.category) ? parsed.category : null;
    let level = LEVELS.includes(parsed.level) ? parsed.level : null;
    const factIds = new Set(facts.map((f) => f.id));
    const evidence = Array.isArray(parsed.evidence) ? parsed.evidence.filter((id) => factIds.has(id)) : [];
    const out = {
        category,
        level,
        explanation: str(parsed.explanation),
        evidence: evidence.length ? [...new Set(evidence)] : ruleResult.evidence,
        deadlineRisk: str(parsed.deadlineRisk, 200) || ruleResult.deadlineRisk,
        suggestedAction: str(parsed.suggestedAction, 300),
        supportiveMessage: str(parsed.supportiveMessage, 500),
    };
    if (!out.category || !out.level || !out.explanation || !out.suggestedAction || !out.supportiveMessage) {
        throw new Error("AI response failed validation");
    }
    // Guardrails: thin data never gets High; workload strain only when explicitly reported.
    if (out.category === "Insufficient evidence" || ruleResult.category === "Insufficient evidence") {
        if (level === "High") level = "Medium";
        out.level = level;
    }
    if (out.category === "Workload strain" && !factIds.has("overloaded")) {
        throw new Error("AI inferred workload strain without explicit report");
    }
    return out;
};

// Returns { ok: true, result } or { ok: false, error }
export const analyzeRiskWithAI = async (input) => {
    if (!isAIConfigured()) return { ok: false, error: "No AI key configured" };
    const call = providers[providerName()];
    if (!call) return { ok: false, error: `Unknown AI_PROVIDER ${process.env.AI_PROVIDER}` };

    try {
        const raw = await call({
            system: SYSTEM_PROMPT,
            user: buildUserPrompt(input),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return { ok: true, result: validate(raw, input.facts, input.ruleResult) };
    } catch (error) {
        console.log("AI analysis failed, using rule engine:", error.message);
        return { ok: false, error: error.message };
    }
};
