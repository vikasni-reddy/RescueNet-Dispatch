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
  if (peopleAffected) boost += Math.min(10, Math.floor(peopleAffected / 5));
  if (createdAtMs) {
    const ageMinutes = (Date.now() - createdAtMs) / 60000;
    boost += Math.min(5, Math.floor(ageMinutes / 6));
  }
  return Math.min(100, base + boost);
}

// ─── Word-number helpers ──────────────────────────────────────────────────────

const WORD_NUMS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, couple: 2, dozen: 12,
  few: 3, several: 6, many: 15, dozens: 24, scores: 40,
};

// Convert "twenty five" → 25, "thirty" → 30, etc.
function wordsToNum(phrase: string): number | null {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  let total = 0;
  let current = 0;
  for (const w of words) {
    const v = WORD_NUMS[w];
    if (v === undefined) return null;
    if (v === 100) {
      current = (current || 1) * 100;
    } else if (v === 1000) {
      total += (current || 1) * 1000;
      current = 0;
    } else if (v >= 20) {
      current += v;
    } else {
      current += v;
    }
  }
  return total + current || null;
}

/** Extract the best people count from free text */
function extractPeopleCount(text: string): number | null {
  const t = text;

  // 1. Digit + qualifier: "12 people", "around 70 residents"
  const digitMatch = t.match(/\b(\d{1,4})\s*(?:to\s*\d+\s*)?(?:people|persons?|individuals?|families|residents?|civilians?|victims?|survivors?|passengers?|workers?|children|students?|villagers?|adults?)\b/i);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  // 2. "family of five / six / ..." 
  const familyWord = t.match(/\bfamily\s+of\s+([a-z\s]+?)(?:\s+(?:is|are|has|have|\.|,))/i);
  if (familyWord) {
    const n = wordsToNum(familyWord[1].trim());
    if (n !== null) return n;
  }
  const familyDigit = t.match(/\bfamily\s+of\s+(\d+)/i);
  if (familyDigit) return parseInt(familyDigit[1], 10);

  // 3. Word-number + qualifier: "three children", "twenty families", "six passengers"
  const wordNumPattern = new RegExp(
    `\\b(${Object.keys(WORD_NUMS).join("|")})(?:\\s+(?:and|or)\\s+(?:${Object.keys(WORD_NUMS).join("|")}))?\\s+(?:people|persons?|individuals?|families|residents?|civilians?|victims?|survivors?|passengers?|workers?|children|adults?|villagers?)\\b`,
    "i"
  );
  const wordMatch = t.match(wordNumPattern);
  if (wordMatch) {
    const n = wordsToNum(wordMatch[1]);
    if (n !== null) return n;
  }

  // 4. Count compound lists: "two children and one elderly woman" → 3
  const listPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+(?:\w+\s+)?(?:and|,)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+/gi;
  const listMatches = [...t.matchAll(listPattern)];
  if (listMatches.length > 0) {
    let total = 0;
    for (const m of listMatches) {
      const a = parseInt(m[1]) || wordsToNum(m[1]);
      const b = parseInt(m[2]) || wordsToNum(m[2]);
      if (a !== null) total += (a as number);
      if (b !== null) total += (b as number);
    }
    if (total > 0) return total;
  }

  // 5. "a couple", "a dozen"
  if (/\ba couple\b/i.test(t)) return 2;
  if (/\ba dozen\b/i.test(t)) return 12;

  return null;
}

// ─── Heuristic rules ──────────────────────────────────────────────────────────

interface HeuristicMatch {
  needType: string;
  disasterType: string;
  incidentCategory: string;
  baseUrgency: string;
  factors: string[];
  resources: string[];
}

const HEURISTIC_RULES: Array<{ keywords: string[]; match: HeuristicMatch }> = [
  {
    keywords: ["fire", "burning", "flames", "blaze", "smoke", "on fire", "ablaze"],
    match: {
      needType: "fire", disasterType: "fire", incidentCategory: "rescue",
      baseUrgency: "high",
      factors: ["Active fire reported", "Fire spread risk identified"],
      resources: ["fire", "medical", "rescue"],
    },
  },
  {
    keywords: ["flood", "flooding", "water rising", "drowning", "submerged", "washed away", "waterlogged", "inundated"],
    match: {
      needType: "rescue", disasterType: "flood", incidentCategory: "rescue",
      baseUrgency: "high",
      factors: ["Flooding / rising water levels reported", "Risk of drowning or hypothermia"],
      resources: ["boat", "rescue", "medical"],
    },
  },
  {
    keywords: ["earthquake", "collapsed", "building collapse", "rubble", "buried", "debris"],
    match: {
      needType: "rescue", disasterType: "building_collapse", incidentCategory: "rescue",
      baseUrgency: "critical",
      factors: ["Structural collapse reported", "Victims likely trapped under debris"],
      resources: ["rescue", "medical", "fire"],
    },
  },
  {
    keywords: ["cyclone", "hurricane", "tornado", "storm damage", "wind damage"],
    match: {
      needType: "rescue", disasterType: "cyclone", incidentCategory: "rescue",
      baseUrgency: "high",
      factors: ["Severe weather event", "Structural damage likely"],
      resources: ["rescue", "medical", "shelter"],
    },
  },
  {
    keywords: ["heart attack", "chest pain", "cardiac", "stroke", "unconscious", "not breathing", "seizure", "coma"],
    match: {
      needType: "medical", disasterType: "medical", incidentCategory: "medical",
      baseUrgency: "critical",
      factors: ["Life-threatening medical emergency", "Immediate clinical intervention required"],
      resources: ["medical"],
    },
  },
  {
    keywords: ["injured", "bleeding", "wound", "accident", "fracture", "broken bone", "hit by", "road accident", "collision"],
    match: {
      needType: "medical", disasterType: "accident", incidentCategory: "medical",
      baseUrgency: "high",
      factors: ["Physical injuries reported", "Medical attention required"],
      resources: ["medical", "rescue"],
    },
  },
  {
    keywords: ["chemical", "gas leak", "toxic", "hazmat", "poisoning", "fumes", "carbon monoxide"],
    match: {
      needType: "rescue", disasterType: "accident", incidentCategory: "rescue",
      baseUrgency: "critical",
      factors: ["Hazardous material / chemical exposure reported", "Evacuation and specialist response needed"],
      resources: ["fire", "medical", "rescue"],
    },
  },
  {
    keywords: ["no food", "food shortage", "starvation", "starving", "hunger", "malnourished", "haven't eaten"],
    match: {
      needType: "food", disasterType: "other", incidentCategory: "relief",
      baseUrgency: "medium",
      factors: ["Food shortage reported", "Risk of malnutrition"],
      resources: ["food"],
    },
  },
  {
    keywords: ["no water", "water shortage", "dehydrated", "dehydration", "no drinking water"],
    match: {
      needType: "water", disasterType: "other", incidentCategory: "relief",
      baseUrgency: "high",
      factors: ["Acute water shortage reported", "Dehydration and health risk"],
      resources: ["food", "rescue"],
    },
  },
  {
    keywords: ["no shelter", "homeless", "displaced", "evacuated", "refugee", "relief camp", "open sky", "no roof"],
    match: {
      needType: "shelter", disasterType: "other", incidentCategory: "relief",
      baseUrgency: "medium",
      factors: ["Displaced population needs shelter", "Exposure risk"],
      resources: ["shelter", "food"],
    },
  },
  {
    keywords: ["violence", "attack", "crime", "robbery", "assault", "threat", "dangerous person", "weapon"],
    match: {
      needType: "police", disasterType: "other", incidentCategory: "rescue",
      baseUrgency: "high",
      factors: ["Security threat reported", "Law enforcement required"],
      resources: ["police", "medical"],
    },
  },
  {
    keywords: ["trapped", "stuck", "stranded", "rooftop", "can't escape", "cannot escape", "no way out"],
    match: {
      needType: "rescue", disasterType: "other", incidentCategory: "rescue",
      baseUrgency: "high",
      factors: ["Person(s) trapped — unable to self-evacuate"],
      resources: ["rescue", "medical"],
    },
  },
];

function heuristicAnalysis(rawText: string): Omit<AiAnalysis, "priorityScore"> {
  const textLower = rawText.toLowerCase();

  // Match first applicable rule
  let matched: HeuristicMatch | null = null;
  for (const rule of HEURISTIC_RULES) {
    if (rule.keywords.some((k) => textLower.includes(k))) {
      matched = rule.match;
      break;
    }
  }

  // Extract people count
  const peopleAffected = extractPeopleCount(rawText);

  // ── Severity escalation ──────────────────────────────────────────────────
  // Start from rule's base urgency, then escalate when multiple risk signals combine
  let severityPoints = 0;

  const hasChildren   = /\b(child|children|infant|baby|toddler|kid|minor|juvenile)\b/i.test(rawText);
  const hasElderly    = /\b(elderly|old (wo)?man|senior|aged person|pensioner)\b/i.test(rawText);
  const hasTrapped    = /\b(trapped|stuck|buried|cannot escape|can't escape|stranded|rooftop|surrounded)\b/i.test(rawText);
  const hasWater      = /\b(flood|rising water|drowning|submerged|water level|heavy rain)\b/i.test(rawText);
  const hasFire       = /\b(fire|flames|burning|blaze|explosion)\b/i.test(rawText);
  const hasUnconscious = /\b(unconscious|unresponsive|not breathing|cardiac|coma|fainted)\b/i.test(rawText);
  const hasMedical    = /\b(diabetic|diabetes|heart|asthma|seizure|medication|medical condition)\b/i.test(rawText);
  const hasNoFood     = /\b(no food|no water|starv|dehydrat|haven't eaten)\b/i.test(rawText);
  const hasLargeCrowd = peopleAffected !== null && peopleAffected >= 20;
  const hasUrgentWord = /\b(urgent|immediate|critical|life-threatening|dying|sos|help now|emergency)\b/i.test(rawText);

  if (hasChildren)    severityPoints += 15;
  if (hasElderly)     severityPoints += 10;
  if (hasTrapped)     severityPoints += 15;
  if (hasWater && hasTrapped) severityPoints += 10; // compound flood+trapped is extra dangerous
  if (hasFire && hasTrapped) severityPoints += 15;
  if (hasUnconscious) severityPoints += 20;
  if (hasMedical)     severityPoints += 8;
  if (hasNoFood)      severityPoints += 6;
  if (hasLargeCrowd)  severityPoints += 8;
  if (hasUrgentWord)  severityPoints += 5;

  let urgency = matched?.baseUrgency ?? "medium";
  // Escalate based on combined severity
  if (severityPoints >= 30 || hasUnconscious || (hasTrapped && (hasChildren || hasElderly || hasFire || hasWater))) {
    urgency = "critical";
  } else if (severityPoints >= 15 && urgency === "medium") {
    urgency = "high";
  } else if (severityPoints < 5 && urgency === "high" && !hasUrgentWord) {
    urgency = "medium";
  }

  // ── Risk factors ─────────────────────────────────────────────────────────
  const factors: string[] = [...(matched?.factors ?? [])];
  if (!matched) factors.push("General emergency — exact classification requires operator review");
  if (hasChildren)    factors.push("Vulnerable population — children at risk");
  if (hasElderly)     factors.push("Vulnerable population — elderly person(s) affected");
  if (hasMedical)     factors.push("Pre-existing medical condition(s) reported (diabetes / heart / other)");
  if (hasNoFood)      factors.push("No food or drinking water available");
  if (hasUnconscious) factors.push("Person(s) unconscious or unresponsive — immediate intervention required");
  if (hasLargeCrowd)  factors.push(`Large number of casualties (${peopleAffected} people affected)`);
  if (/\b(night|dark|no light|power cut|blackout)\b/i.test(rawText)) {
    factors.push("Low-visibility / nighttime conditions");
  }
  if (/\b(rooftop|roof|upper floor|terrace)\b/i.test(rawText)) {
    factors.push("Victims stranded at height — elevated rescue difficulty");
  }

  // ── Confidence — higher when more signals matched ──────────────────────
  const signalCount = [hasChildren, hasElderly, hasTrapped, hasWater || hasFire, hasUnconscious, hasMedical, hasNoFood].filter(Boolean).length;
  const aiConfidence = matched
    ? Math.min(75, 48 + signalCount * 4 + (hasUrgentWord ? 5 : 0))
    : Math.min(50, 35 + signalCount * 3);

  // ── Summary ──────────────────────────────────────────────────────────────
  const needLabel = matched?.needType ?? "rescue";
  const locationHint = rawText.match(/\b(?:at|near|in|from)\s+([A-Z][a-zA-Z\s,]{2,30})/)?.[1]?.trim() ?? null;

  const who = peopleAffected
    ? `${peopleAffected} ${peopleAffected === 1 ? "person" : "people"}`
    : "civilians";
  const vulnParts = [hasChildren && "including children", hasElderly && "and elderly person(s)"].filter(Boolean).join(" ");
  const whoFull = vulnParts ? `${who} (${vulnParts})` : who;

  const scenarioParts: string[] = [];
  if (hasTrapped) scenarioParts.push("trapped and unable to evacuate");
  if (hasWater)   scenarioParts.push("amid rising flood waters");
  if (hasFire)    scenarioParts.push("due to active fire");
  if (hasNoFood)  scenarioParts.push("with no food or water");
  const scenario = scenarioParts.length ? ` — ${scenarioParts.join(", ")}` : "";

  const locationStr = locationHint ? ` near ${locationHint}` : "";
  const summary = `${urgency.charAt(0).toUpperCase() + urgency.slice(1)} ${needLabel} emergency: ${whoFull}${scenario}${locationStr}. Immediate response required.`;

  // ── Explanation ──────────────────────────────────────────────────────────
  const riskParts: string[] = [];
  if (hasTrapped)     riskParts.push("entrapment");
  if (hasChildren)    riskParts.push("children");
  if (hasElderly)     riskParts.push("elderly person(s)");
  if (hasMedical)     riskParts.push("pre-existing medical condition");
  if (hasWater)       riskParts.push("rising water levels");
  if (hasFire)        riskParts.push("active fire");
  if (hasUnconscious) riskParts.push("unconscious victims");
  if (hasNoFood)      riskParts.push("no food/water");

  const riskStr = riskParts.length
    ? `Key risk factors: ${riskParts.join(", ")}.`
    : "Risk factors assessed from incident report keywords.";

  const aiExplanation = `Heuristic triage — AI service offline. Urgency classified as ${urgency.toUpperCase()} based on keyword pattern matching (${matched ? matched.needType : "general"} incident). ${riskStr} Deploy recommended resources immediately.`;

  return {
    needType: matched?.needType ?? "rescue",
    urgency,
    peopleAffected,
    summary,
    languageDetected: "English",
    translatedText: null,
    disasterType: matched?.disasterType ?? null,
    incidentCategory: matched?.incidentCategory ?? "rescue",
    aiConfidence,
    aiExplanation,
    reasoningFactors: factors,
    requiredResources: matched?.resources ?? ["rescue", "medical"],
    analysisMode: "heuristic",
  };
}

// ─── Main analysis entry point ────────────────────────────────────────────────

export async function analyzeIncident(rawText: string): Promise<AiAnalysis> {
  const systemPrompt = `You are a disaster-response triage AI. Given a free-text emergency report (any language), extract structured data and return ONLY valid JSON with this exact schema:
{
  "need_type": "medical | rescue | fire | police | food | water | shelter | other",
  "urgency": "critical | high | medium | low",
  "people_affected": <integer — count ALL individuals mentioned; infer from phrases like "family of five" = 5, "two children and one elderly" = 3; null only if truly unknown>,
  "summary": "<one concrete sentence in English describing exactly who is affected, what is happening, and what is needed — no vague phrasing>",
  "language_detected": "<language name in English>",
  "translated_text": "<English translation if not in English, otherwise null>",
  "disaster_type": "<flood | fire | earthquake | cyclone | building_collapse | accident | medical | violence | other | null>",
  "incident_category": "<rescue | relief | medical | infrastructure | null>",
  "ai_confidence": <integer 60–98 — reflect certainty; never return less than 60 for a clear report>,
  "ai_explanation": "<two sentences: (1) justify the urgency rating citing specific signals from the text; (2) recommend specific resources and explain why>",
  "reasoning_factors": ["<concrete signal 1 from the report>", "<concrete signal 2>", ...],
  "required_resources": ["<resource type 1>", "<resource type 2>", ...]
}

required_resources must use only: ["medical", "rescue", "fire", "police", "food", "water", "shelter", "boat"]
reasoning_factors MUST quote or paraphrase actual details from the report (e.g. "Five people trapped on rooftop", "Elderly diabetic woman reported", "Water levels rising rapidly").
ai_confidence: use 85–98 for clear high-urgency reports, 70–84 for moderate clarity, 60–69 for ambiguous.
people_affected: ALWAYS try to extract a number — count individuals even when described as "a family of five" (5), "two children and one adult" (3), "a couple" (2).
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

    const urgency = parsed.urgency ?? "medium";
    const peopleAffected = parsed.people_affected ?? extractPeopleCount(rawText);
    const priorityScore = computePriorityScore(urgency, rawText, peopleAffected);

    const requiredResources: string[] = Array.isArray(parsed.required_resources)
      ? parsed.required_resources.filter((r: unknown) => typeof r === "string")
      : [];

    return {
      needType: parsed.need_type ?? "rescue",
      urgency,
      peopleAffected,
      summary: parsed.summary ?? rawText.slice(0, 200),
      languageDetected: parsed.language_detected ?? "English",
      translatedText: parsed.translated_text ?? null,
      disasterType: parsed.disaster_type ?? null,
      incidentCategory: parsed.incident_category ?? null,
      aiConfidence: typeof parsed.ai_confidence === "number"
        ? Math.max(60, Math.min(98, Math.round(parsed.ai_confidence)))
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

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export { computePriorityScore, heuristicAnalysis };
