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
  requiredResources: string[];
  priorityScore: number;
  analysisMode: "full_ai" | "heuristic";
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
  { keywords: ["fire", "burning", "flames", "smoke", "blaze"], boost: 10 },
  { keywords: ["flood", "flooding", "drowning", "water rising", "submerged"], boost: 8 },
  { keywords: ["bleeding", "wound", "injury", "injured", "hurt"], boost: 8 },
  { keywords: ["multiple", "many people", "crowd", "group", "families"], boost: 5 },
  { keywords: ["no food", "no water", "starvation", "starving", "dehydrated", "hunger"], boost: 6 },
  { keywords: ["immediate", "urgent", "emergency", "help now", "sos", "please help"], boost: 5 },
  { keywords: ["earthquake", "collapsed building", "rubble"], boost: 12 },
  { keywords: ["cyclone", "hurricane", "tornado", "storm"], boost: 8 },
  { keywords: ["gas leak", "chemical", "hazmat", "toxic"], boost: 10 },
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

  if (peopleAffected) {
    boost += Math.min(10, Math.floor(peopleAffected / 5));
  }

  if (createdAtMs) {
    const ageMinutes = (Date.now() - createdAtMs) / 60000;
    boost += Math.min(5, Math.floor(ageMinutes / 6));
  }

  return Math.min(100, base + boost);
}

// ─── Heuristic fallback (runs when OpenAI is unavailable) ────────────────────

interface HeuristicMatch {
  needType: string;
  disasterType: string | null;
  incidentCategory: string;
  urgencyBonus: number;
  factors: string[];
  resources: string[];
}

const HEURISTIC_RULES: Array<{
  keywords: string[];
  match: HeuristicMatch;
}> = [
  {
    keywords: ["fire", "burning", "flames", "blaze", "smoke", "on fire"],
    match: {
      needType: "fire",
      disasterType: "fire",
      incidentCategory: "rescue",
      urgencyBonus: 20,
      factors: ["Active fire reported", "Fire spread risk identified"],
      resources: ["fire", "medical", "rescue"],
    },
  },
  {
    keywords: ["flood", "flooding", "water rising", "drowning", "submerged", "washed away"],
    match: {
      needType: "rescue",
      disasterType: "flood",
      incidentCategory: "rescue",
      urgencyBonus: 15,
      factors: ["Flooding / rising water levels", "Risk of drowning"],
      resources: ["boat", "rescue", "medical"],
    },
  },
  {
    keywords: ["earthquake", "collapsed", "building collapse", "rubble", "buried"],
    match: {
      needType: "rescue",
      disasterType: "earthquake",
      incidentCategory: "rescue",
      urgencyBonus: 20,
      factors: ["Structural collapse reported", "Victims may be trapped"],
      resources: ["rescue", "medical", "fire"],
    },
  },
  {
    keywords: ["cyclone", "hurricane", "tornado", "storm", "wind damage"],
    match: {
      needType: "rescue",
      disasterType: "cyclone",
      incidentCategory: "rescue",
      urgencyBonus: 12,
      factors: ["Severe weather event", "Structural damage likely"],
      resources: ["rescue", "medical", "shelter"],
    },
  },
  {
    keywords: ["heart attack", "chest pain", "cardiac", "stroke", "unconscious", "not breathing", "seizure"],
    match: {
      needType: "medical",
      disasterType: "medical",
      incidentCategory: "medical",
      urgencyBonus: 25,
      factors: ["Life-threatening medical emergency", "Immediate clinical intervention required"],
      resources: ["medical"],
    },
  },
  {
    keywords: ["injured", "bleeding", "wound", "accident", "fracture", "broken bone", "hurt"],
    match: {
      needType: "medical",
      disasterType: "accident",
      incidentCategory: "medical",
      urgencyBonus: 10,
      factors: ["Physical injuries reported", "Medical attention required"],
      resources: ["medical", "rescue"],
    },
  },
  {
    keywords: ["no food", "food shortage", "starvation", "starving", "hunger", "malnourished"],
    match: {
      needType: "food",
      disasterType: "other",
      incidentCategory: "relief",
      urgencyBonus: 5,
      factors: ["Food shortage reported", "Risk of malnutrition"],
      resources: ["food"],
    },
  },
  {
    keywords: ["no water", "water shortage", "dehydrated", "dehydration", "water supply"],
    match: {
      needType: "water",
      disasterType: "other",
      incidentCategory: "relief",
      urgencyBonus: 8,
      factors: ["Water shortage reported", "Dehydration risk"],
      resources: ["food", "rescue"],
    },
  },
  {
    keywords: ["no shelter", "homeless", "displaced", "refugee", "evacuation", "relief camp"],
    match: {
      needType: "shelter",
      disasterType: "other",
      incidentCategory: "relief",
      urgencyBonus: 5,
      factors: ["Displaced population needs shelter", "Exposure risk"],
      resources: ["shelter", "food"],
    },
  },
  {
    keywords: ["violence", "attack", "crime", "robbery", "threat", "police", "dangerous person"],
    match: {
      needType: "police",
      disasterType: "other",
      incidentCategory: "rescue",
      urgencyBonus: 15,
      factors: ["Security threat reported", "Law enforcement required"],
      resources: ["police", "medical"],
    },
  },
  {
    keywords: ["trapped", "stuck", "stranded", "can't move", "cannot escape"],
    match: {
      needType: "rescue",
      disasterType: "other",
      incidentCategory: "rescue",
      urgencyBonus: 12,
      factors: ["Person(s) trapped or unable to self-evacuate"],
      resources: ["rescue", "medical"],
    },
  },
];

function heuristicAnalysis(rawText: string): Omit<AiAnalysis, "priorityScore"> {
  const textLower = rawText.toLowerCase();

  // Match rules
  let matched: HeuristicMatch | null = null;
  for (const rule of HEURISTIC_RULES) {
    if (rule.keywords.some((k) => textLower.includes(k))) {
      matched = rule.match;
      break;
    }
  }

  // Extract people count with regex
  let peopleAffected: number | null = null;
  const peopleMatch = rawText.match(/(\d+)\s*(?:people|persons?|individuals?|families|children|victims?|survivors?|residents?)/i);
  if (peopleMatch) {
    peopleAffected = parseInt(peopleMatch[1], 10);
  }

  // Detect urgency signals
  let urgency = "medium";
  let urgencyBonus = matched?.urgencyBonus ?? 0;

  const criticalWords = ["critical", "life-threatening", "dying", "dead", "not breathing", "cardiac", "unconscious", "trapped in fire"];
  const highWords = ["urgent", "emergency", "immediate", "bleeding", "injured", "trapped", "flood", "fire", "collapse", "sos"];
  const lowWords = ["minor", "not urgent", "when possible", "non-emergency"];

  if (criticalWords.some((w) => textLower.includes(w))) urgency = "critical";
  else if (highWords.some((w) => textLower.includes(w)) || urgencyBonus >= 15) urgency = "high";
  else if (lowWords.some((w) => textLower.includes(w))) urgency = "low";
  else urgency = "medium";

  // Build reasoning factors
  const factors: string[] = [...(matched?.factors ?? [])];
  if (!matched) factors.push("General emergency report — exact classification pending review");
  if (peopleAffected && peopleAffected > 10) factors.push(`Large group affected (${peopleAffected} people)`);
  if (textLower.includes("child") || textLower.includes("infant") || textLower.includes("baby"))
    factors.push("Vulnerable population — children at risk");
  if (textLower.includes("elderly") || textLower.includes("old woman") || textLower.includes("old man"))
    factors.push("Vulnerable population — elderly person(s) affected");
  if (textLower.includes("night") || textLower.includes("dark"))
    factors.push("Nighttime conditions — visibility risk");

  // Generate summary
  const needLabel = matched?.needType ?? "general";
  const locationHint = rawText.match(/(?:at|near|in|from)\s+([A-Z][a-zA-Z\s,]+)/)?.[1]?.trim() ?? null;
  const summary = locationHint
    ? `${urgency.charAt(0).toUpperCase() + urgency.slice(1)} ${needLabel} emergency reported near ${locationHint}${peopleAffected ? ` affecting ${peopleAffected} people` : ""}.`
    : `${urgency.charAt(0).toUpperCase() + urgency.slice(1)} ${needLabel} emergency reported${peopleAffected ? ` affecting approximately ${peopleAffected} people` : ""}. Operator review recommended.`;

  const confidence = matched ? 52 : 38;

  return {
    needType: matched?.needType ?? "other",
    urgency,
    peopleAffected,
    summary,
    languageDetected: "English",
    translatedText: null,
    disasterType: matched?.disasterType ?? null,
    incidentCategory: matched?.incidentCategory ?? "rescue",
    aiConfidence: confidence,
    aiExplanation: `Heuristic classification applied (AI service offline). ${matched ? `Keyword signals matched: ${matched.needType} incident pattern.` : "No strong keyword match found — manual review advised."}`,
    reasoningFactors: factors,
    requiredResources: matched?.resources ?? ["rescue"],
    analysisMode: "heuristic",
  };
}

// ─── Main analysis function ──────────────────────────────────────────────────

export async function analyzeIncident(rawText: string): Promise<AiAnalysis> {
  const systemPrompt = `You are a disaster-response triage AI. Given a free-text emergency report (any language), extract structured data and return ONLY valid JSON with this exact schema:
{
  "need_type": "medical | rescue | fire | police | food | water | shelter | other",
  "urgency": "critical | high | medium | low",
  "people_affected": <integer or null>,
  "summary": "<one clear sentence in English describing the emergency>",
  "language_detected": "<language name in English>",
  "translated_text": "<English translation if not English, otherwise null>",
  "disaster_type": "<flood | fire | earthquake | cyclone | building_collapse | accident | medical | violence | other | null>",
  "incident_category": "<rescue | relief | medical | infrastructure | null>",
  "ai_confidence": <integer 55–98 reflecting your certainty>,
  "ai_explanation": "<one sentence justifying the urgency rating and classification, citing specific signals in the report>",
  "reasoning_factors": ["<specific signal 1 from the report>", "<specific signal 2>", ...],
  "required_resources": ["<resource type 1>", "<resource type 2>", ...]
}

required_resources must list only types from: ["medical", "rescue", "fire", "police", "food", "water", "shelter", "boat"]
reasoning_factors must cite concrete signals from the report text (e.g. "Person unconscious at scene", "30 families without food", "Water level rising rapidly").
ai_confidence must be at least 55 when you have enough signal.
No prose, no markdown — only the JSON object.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 900,
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

    const requiredResources: string[] = Array.isArray(parsed.required_resources)
      ? parsed.required_resources.filter((r: unknown) => typeof r === "string")
      : [];

    return {
      needType: parsed.need_type ?? "other",
      urgency,
      peopleAffected,
      summary: parsed.summary ?? rawText.slice(0, 200),
      languageDetected: parsed.language_detected ?? "English",
      translatedText: parsed.translated_text ?? null,
      disasterType: parsed.disaster_type ?? null,
      incidentCategory: parsed.incident_category ?? null,
      aiConfidence: typeof parsed.ai_confidence === "number"
        ? Math.max(55, Math.min(98, Math.round(parsed.ai_confidence)))
        : 72,
      aiExplanation: parsed.ai_explanation ?? "",
      reasoningFactors: Array.isArray(parsed.reasoning_factors) ? parsed.reasoning_factors : [],
      requiredResources,
      priorityScore,
      analysisMode: "full_ai",
    };
  } catch (err) {
    logger.error({ err }, "AI analysis failed — falling back to heuristic scoring");
    const heuristic = heuristicAnalysis(rawText);
    const priorityScore = computePriorityScore(heuristic.urgency, rawText, heuristic.peopleAffected);
    return { ...heuristic, priorityScore };
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
  return Math.round((distKm / 30) * 60);
}

export { computePriorityScore };
