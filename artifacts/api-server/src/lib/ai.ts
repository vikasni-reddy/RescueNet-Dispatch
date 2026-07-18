import OpenAI from "openai";
import { logger } from "./logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AiAnalysis {
  needType: string;
  urgency: string;
  peopleAffected: number | null;
  summary: string;
  languageDetected: string;
  translatedText: string | null;
  disasterType: string | null;
  incidentCategory: string | null;
  aiConfidence: number;
  aiExplanation: string;
  reasoningFactors: string[];
  priorityScore: number;
}

const URGENCY_BASE: Record<string, number> = {
  critical: 90,
  high: 70,
  medium: 45,
  low: 20,
};

const KEYWORD_BOOSTS: Array<{ keywords: string[]; boost: number }> = [
  { keywords: ["trapped", "trapping", "stuck", "buried", "collapsed"], boost: 12 },
  { keywords: ["unconscious", "unresponsive", "not breathing", "cardiac"], boost: 15 },
  { keywords: ["child", "children", "infant", "baby", "toddler"], boost: 10 },
  { keywords: ["elderly", "old woman", "old man", "senior"], boost: 8 },
  { keywords: ["fire", "burning", "flames", "smoke"], boost: 10 },
  { keywords: ["flood", "flooding", "drowning", "water rising"], boost: 8 },
  { keywords: ["bleeding", "wound", "injury", "injured", "hurt"], boost: 8 },
  { keywords: ["multiple", "many people", "crowd", "group"], boost: 5 },
  { keywords: ["no food", "no water", "starvation", "dehydrated"], boost: 6 },
  { keywords: ["immediate", "urgent", "emergency", "help now", "sos"], boost: 5 },
];

function computePriorityScore(
  urgency: string,
  rawText: string,
  peopleAffected: number | null,
  createdAtMs?: number
): number {
  const base = URGENCY_BASE[urgency] ?? 20;
  const textLower = (rawText || "").toLowerCase();

  let boost = 0;
  for (const { keywords, boost: b } of KEYWORD_BOOSTS) {
    if (keywords.some((k) => textLower.includes(k))) {
      boost += b;
    }
  }

  // people affected boost (capped)
  if (peopleAffected) {
    boost += Math.min(10, Math.floor(peopleAffected / 5));
  }

  // time decay: older unresolved incidents get a slight boost (max +5 after 30 min)
  if (createdAtMs) {
    const ageMinutes = (Date.now() - createdAtMs) / 60000;
    boost += Math.min(5, Math.floor(ageMinutes / 6));
  }

  return Math.min(100, base + boost);
}

export async function analyzeIncident(rawText: string): Promise<AiAnalysis> {
  const systemPrompt = `You are a disaster-response triage assistant. Given a free-text help request (which may be in any language), extract structured information and return ONLY valid JSON with this exact schema:
{
  "need_type": "medical | rescue | food | water | shelter | other",
  "urgency": "critical | high | medium | low",
  "people_affected": <integer or null>,
  "summary": "<one concise sentence in English describing the emergency>",
  "language_detected": "<language name in English>",
  "translated_text": "<English translation if not English, otherwise null>",
  "disaster_type": "<flood | fire | earthquake | cyclone | building_collapse | accident | medical | other | null>",
  "incident_category": "<rescue | relief | medical | infrastructure | null>",
  "ai_confidence": <number 0-100>,
  "ai_explanation": "<one sentence explaining the urgency assessment>",
  "reasoning_factors": ["<factor 1>", "<factor 2>", ...]
}

reasoning_factors should list the specific signals that drove the urgency rating (e.g. "Elderly person trapped", "Rising water levels", "Multiple children at risk").
No prose, no markdown, only the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const urgency = parsed.urgency ?? "low";
    const peopleAffected = parsed.people_affected ?? null;
    const priorityScore = computePriorityScore(urgency, rawText, peopleAffected);

    return {
      needType: parsed.need_type ?? "other",
      urgency,
      peopleAffected,
      summary: parsed.summary ?? rawText.slice(0, 200),
      languageDetected: parsed.language_detected ?? "English",
      translatedText: parsed.translated_text ?? null,
      disasterType: parsed.disaster_type ?? null,
      incidentCategory: parsed.incident_category ?? null,
      aiConfidence: parsed.ai_confidence ?? 75,
      aiExplanation: parsed.ai_explanation ?? "",
      reasoningFactors: Array.isArray(parsed.reasoning_factors) ? parsed.reasoning_factors : [],
      priorityScore,
    };
  } catch (err) {
    logger.error({ err }, "AI analysis failed, using fallback scoring");
    const urgency = "low";
    const priorityScore = computePriorityScore(urgency, rawText, null);
    return {
      needType: "other",
      urgency,
      peopleAffected: null,
      summary: rawText.slice(0, 200),
      languageDetected: "Unknown",
      translatedText: null,
      disasterType: null,
      incidentCategory: null,
      aiConfidence: 0,
      aiExplanation: "AI analysis unavailable",
      reasoningFactors: [],
      priorityScore,
    };
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function etaMinutes(distKm: number): number {
  // Assume avg 30 km/h in disaster scenario
  return Math.round((distKm / 30) * 60);
}

export { computePriorityScore };
