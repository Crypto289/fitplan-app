import type { ProfileData } from '../pages/OnboardingPage'
import type { PreferencesData } from '../pages/PreferencesPage'

// ── Constants ─────────────────────────────────────────────────────────────────

const API_URL = 'https://api.mistral.ai/v1/chat/completions'
const MODEL = 'mistral-large-latest'

// ── Response types ─────────────────────────────────────────────────────────────

export interface Uebung {
  name: string
  sets: number
  wiederholungen: string
  pause: string
  maschine: string
  beschreibung: string
}

export interface TrainingDay {
  tag: string
  focus: string
  uebungen: Uebung[]
}

export interface Mahlzeit {
  typ: string
  name: string
  kalorien: number
  zutaten: string[]
  zubereitung?: string[]
}

export interface NutritionDay {
  tag: string
  mahlzeiten: Mahlzeit[]
}

export interface NutritionPlan {
  kalorien_ziel: number
  protein_g: number
  kohlenhydrate_g: number
  fett_g: number
  wochentage: NutritionDay[]
}

export interface SupplementTiming {
  supplement: string
  zeitpunkt: string
  menge: string
  hinweis: string
}

export interface FitnessPlan {
  trainingsplan: TrainingDay[]
  ernaehrungsplan: NutritionPlan
  supplement_timing: SupplementTiming[]
  allgemeine_tipps: string[]
}

// ── Error class ───────────────────────────────────────────────────────────────

export type MistralErrorCode =
  | 'missingKey'
  | 'network'
  | 'auth'
  | 'forbidden'
  | 'rateLimit'
  | 'server'
  | 'invalidResponse'
  | 'emptyResponse'
  | 'parseError'
  | 'unknown'

export class MistralError extends Error {
  constructor(
    public readonly code: MistralErrorCode,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'MistralError'
  }
}

// ── Label maps ────────────────────────────────────────────────────────────────

const GENDER = {
  de: { male: 'Männlich', female: 'Weiblich', diverse: 'Divers' },
  en: { male: 'Male', female: 'Female', diverse: 'Non-binary' },
} as const

const EXPERIENCE = {
  de: { beginner: 'Anfänger (< 1 Jahr)', intermediate: 'Fortgeschritten (1–3 Jahre)', advanced: 'Erfahren (3+ Jahre)' },
  en: { beginner: 'Beginner (< 1 year)', intermediate: 'Intermediate (1–3 years)', advanced: 'Advanced (3+ years)' },
} as const

const OCCUPATION = {
  de: { desk: 'Bürojob (wenig Bewegung)', standing: 'Handwerk / Stehen (moderat)', heavy: 'Körperlich schwer (sehr aktiv)' },
  en: { desk: 'Desk job (low activity)', standing: 'Trade / Standing (moderate)', heavy: 'Physically demanding (very active)' },
} as const

const GYM = {
  de: { chain: 'McFit / Kette (nur Geräte)', standard: 'Standard (Geräte + Freihantel)', full: 'Voll ausgestattet' },
  en: { chain: 'Chain gym (machines only)', standard: 'Standard (machines + free weights)', full: 'Fully equipped' },
} as const

const DAY_SHORT = {
  de: { mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So' },
  en: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
} as const

const GOAL = {
  de: { muscle: 'Muskelaufbau', lose: 'Abnehmen', gain: 'Gewichtszunahme', endurance: 'Ausdauer', mobility: 'Beweglichkeit', fitness: 'Allgemeine Fitness' },
  en: { muscle: 'Build Muscle', lose: 'Lose Weight', gain: 'Gain Weight', endurance: 'Endurance', mobility: 'Mobility', fitness: 'General Fitness' },
} as const

const MUSCLE = {
  de: { chest: 'Brust', back: 'Rücken', shoulders: 'Schultern', arms: 'Arme', legs: 'Beine', core: 'Core', fullbody: 'Ganzkörper' },
  en: { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms', legs: 'Legs', core: 'Core', fullbody: 'Full Body' },
} as const

// ── JSON schema (embedded in system prompt) ───────────────────────────────────

const JSON_SCHEMA = `{
  "trainingsplan": [
    {
      "tag": "string",
      "focus": "string",
      "uebungen": [
        {
          "name": "string",
          "sets": number,
          "wiederholungen": "string",
          "pause": "string",
          "maschine": "string",
          "beschreibung": "string"
        }
      ]
    }
  ],
  "ernaehrungsplan": {
    "kalorien_ziel": number,
    "protein_g": number,
    "kohlenhydrate_g": number,
    "fett_g": number,
    "wochentage": [
      {
        "tag": "string",
        "mahlzeiten": [
          { "typ": "string", "name": "string", "kalorien": number, "zutaten": ["string"], "zubereitung": ["string"] }
        ]
      }
    ]
  },
  "supplement_timing": [
    { "supplement": "string", "zeitpunkt": "string", "menge": "string", "hinweis": "string" }
  ],
  "allgemeine_tipps": ["string"]
}`

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(lang: 'de' | 'en', mealCountHint: string): string {
  if (lang === 'de') {
    return `Du bist ein erfahrener Personal Trainer und Ernährungsberater.
Erstelle einen individualisierten Fitness- und Ernährungsplan basierend auf den Nutzerdaten.

═══ OBERSTE PRIORITÄT — KALORIEN- UND MAKRO-BERECHNUNG ═══

PFLICHT-FORMEL (Mifflin-St-Jeor):
- Männer: BMR = 10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter + 5
- Frauen: BMR = 10 × Gewicht(kg) + 6.25 × Größe(cm) − 5 × Alter − 161
- Divers: Mittelwert der beiden Formeln

AKTIVITÄTSFAKTOR (basierend auf Beruf + tägliche Schritte):
- Bürojob + < 5.000 Schritte → 1.2
- Bürojob + 5.000–10.000 Schritte ODER Handwerk + < 5.000 → 1.375
- Handwerk + 5.000–10.000 Schritte ODER Bürojob + > 10.000 → 1.55
- Handwerk + > 10.000 Schritte ODER körperlich schwer → 1.725
TDEE = BMR × Aktivitätsfaktor

ZIEL-ANPASSUNG:
- Muskelaufbau: kalorien_ziel = TDEE + 300
- Abnehmen: kalorien_ziel = TDEE − 500
- Gewichtszunahme: kalorien_ziel = TDEE + 500
- Ausdauer / Beweglichkeit / Allgemeine Fitness: kalorien_ziel = TDEE (Erhaltung)

MAKRO-VERTEILUNG (% der Kalorien — Protein 4 kcal/g, KH 4 kcal/g, Fett 9 kcal/g):
- Muskelaufbau / Gewichtszunahme: 30 % Protein, 45 % KH, 25 % Fett
- Abnehmen: 35 % Protein, 35 % KH, 30 % Fett
- Ausdauer: 20 % Protein, 55 % KH, 25 % Fett
- Beweglichkeit / Allgemeine Fitness: 25 % Protein, 45 % KH, 30 % Fett

Falls Körperfettanteil angegeben: Bei hohem Körperfett (> 25 %) Protein-Anteil leicht erhöhen (+5 %), KH entsprechend reduzieren.

═══ MAHLZEITEN-STRUKTUR (NICHT VERHANDELBAR) ═══

Das "mahlzeiten"-Array MUSS exakt ${mealCountHint} Einträge pro Tag haben.
Jeder Eintrag: { "typ": string, "name": string, "kalorien": number, "zutaten": string[] }
- "typ" benennt die Mahlzeit (z. B. "Frühstück", "Mittagssnack", "Mittagessen", "Pre-Workout", "Abendessen")
- Summe der "kalorien" pro Tag ≈ kalorien_ziel (±100 kcal)

═══ NAMEN-REGELN (NICHT VERHANDELBAR) ═══

MAHLZEITEN-NAMEN:
- Der "name" MUSS die tatsächlichen Hauptzutaten wörtlich widerspiegeln
- VERBOTEN: "Frühstück", "Gesunde Mahlzeit", Zutaten im Namen die nicht in "zutaten" stehen
- PFLICHT: Format "[Hauptzutat] mit [Beilage]" — z. B. "Rührei mit Spinat und Vollkorntoast"
- Jede Generierung soll ANDERE Mahlzeiten verwenden — sei kreativ, keine Standard-Klischees

ZUTATEN-MENGEN (PFLICHT):
- Jede Zutat im "zutaten"-Array MUSS eine konkrete Mengenangabe enthalten
- PFLICHT-Format: "120g Hähnchenbrust", "2 Eier", "50g Haferflocken", "1 EL Olivenöl", "200ml Milch"
- VERBOTEN: nur den Zutatennamen ohne Menge (z. B. "Hähnchenbrust", "Eier", "Olivenöl")

ZUBEREITUNG (PFLICHT):
- Jede Mahlzeit MUSS ein "zubereitung"-Array mit 4 bis 6 Schritten enthalten
- Format: kurze, klare Anweisungen im Imperativ, OHNE Mengenangaben (Mengen stehen in "zutaten")
- Beispiel: ["Eier in Schüssel verquirlen", "Pfanne mit Olivenöl erhitzen", "Eier 2 Minuten anbraten", "Spinat dazugeben und 1 Minute mitdünsten", "Mit Salz und Pfeffer abschmecken", "Auf Toast servieren"]
- VERBOTEN: leeres Array, weniger als 4 oder mehr als 6 Schritte, ganze Sätze mit Mengen

ÜBUNGS-NAMEN:
- Konkrete Übung (z. B. "Schrägbankdrücken mit Kurzhanteln", "Klimmzüge am Latzug")
- VERBOTEN: "Übung 1", "Kraftübung", "Gerät A"
- Keine doppelten Übungsnamen innerhalb oder zwischen Trainingstagen
- Jede Generierung soll ANDERE Übungen verwenden — variiere bewusst

═══ WEITERE PFLICHTREGELN ═══

- Verletzungen / Einschränkungen bei der Übungsauswahl strikt berücksichtigen
- Allergien und Unverträglichkeiten in keiner Mahlzeit verwenden
- Unbeliebte Zutaten DÜRFEN NIRGENDWO vorkommen — auch nicht als Nebenbestandteil oder Beilage
- Nur Geräte/Übungen aus dem gewählten Fitnessstudio-Typ
- Wochenbudget einhalten — Zutaten müssen realistisch im Budget liegen
- Essenspräferenz strikt einhalten
- Wenn Trainingsregionen pro Tag vorgegeben sind: Übungen MÜSSEN exakt diese Muskelgruppen treffen

SPRACHE: Alle Textwerte im JSON MÜSSEN auf DEUTSCH sein.

Antworte AUSSCHLIESSLICH mit validem JSON — kein Markdown, keine Code-Blöcke, keine Erklärungen.
Das JSON muss exakt diesem Schema entsprechen:

${JSON_SCHEMA}`
  }

  return `You are an experienced personal trainer and nutritionist.
Create an individualized fitness and nutrition plan based on the user data.

═══ TOP PRIORITY — CALORIE AND MACRO CALCULATION ═══

REQUIRED FORMULA (Mifflin-St-Jeor):
- Men: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
- Women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
- Non-binary: average of the two formulas

ACTIVITY FACTOR (based on occupation + daily steps):
- Desk + < 5,000 steps → 1.2
- Desk + 5,000–10,000 steps OR Trade + < 5,000 → 1.375
- Trade + 5,000–10,000 steps OR Desk + > 10,000 → 1.55
- Trade + > 10,000 steps OR physically demanding → 1.725
TDEE = BMR × activity factor

GOAL ADJUSTMENT:
- Build muscle: kalorien_ziel = TDEE + 300
- Lose weight: kalorien_ziel = TDEE − 500
- Gain weight: kalorien_ziel = TDEE + 500
- Endurance / Mobility / General fitness: kalorien_ziel = TDEE (maintenance)

MACRO DISTRIBUTION (% of calories — Protein 4 kcal/g, Carbs 4 kcal/g, Fat 9 kcal/g):
- Build muscle / Gain weight: 30 % Protein, 45 % Carbs, 25 % Fat
- Lose weight: 35 % Protein, 35 % Carbs, 30 % Fat
- Endurance: 20 % Protein, 55 % Carbs, 25 % Fat
- Mobility / General fitness: 25 % Protein, 45 % Carbs, 30 % Fat

If body fat is given: at high body fat (> 25 %), increase Protein slightly (+5 %), decrease Carbs accordingly.

═══ MEAL STRUCTURE (NON-NEGOTIABLE) ═══

The "mahlzeiten" array MUST contain exactly ${mealCountHint} entries per day.
Each entry: { "typ": string, "name": string, "kalorien": number, "zutaten": string[] }
- "typ" labels the meal (e.g. "Breakfast", "Mid-morning snack", "Lunch", "Pre-workout", "Dinner")
- Sum of "kalorien" per day ≈ kalorien_ziel (±100 kcal)

═══ NAMING RULES (NON-NEGOTIABLE) ═══

MEAL NAMES:
- The "name" MUST literally reflect the actual main ingredients
- FORBIDDEN: "Breakfast", "Healthy Meal", ingredients in the name not in "zutaten"
- REQUIRED: Format "[Main ingredient] with [side]" — e.g. "Scrambled Eggs with Spinach and Whole Grain Toast"
- Each generation should use DIFFERENT meals — be creative, no standard clichés

INGREDIENT QUANTITIES (REQUIRED):
- Every ingredient in the "zutaten" array MUST include a concrete quantity
- REQUIRED format: "120g chicken breast", "2 eggs", "50g oats", "1 tbsp olive oil", "200ml milk"
- FORBIDDEN: ingredient name without quantity (e.g. "chicken breast", "eggs", "olive oil")

COOKING STEPS (REQUIRED):
- Every meal MUST contain a "zubereitung" array with 4 to 6 steps
- Format: short, clear imperative instructions, WITHOUT quantities (quantities live in "zutaten")
- Example: ["Whisk eggs in a bowl", "Heat olive oil in a pan", "Cook eggs for 2 minutes", "Add spinach and sauté for 1 minute", "Season with salt and pepper", "Serve on toast"]
- FORBIDDEN: empty array, fewer than 4 or more than 6 steps, full sentences with quantities

EXERCISE NAMES:
- Specific exercise (e.g. "Incline Dumbbell Press", "Lat Pulldown", "Romanian Deadlift")
- FORBIDDEN: "Exercise 1", "Strength Exercise", "Machine A"
- No duplicate names within or across training days
- Each generation should use DIFFERENT exercises — vary deliberately

═══ ADDITIONAL MANDATORY RULES ═══

- Strictly account for injuries / limitations when selecting exercises
- Never use allergens / intolerances in any meal
- Disliked ingredients MUST NOT appear ANYWHERE — not even as a side or minor component
- Only equipment/exercises from the selected gym type
- Respect the weekly budget — ingredients must fit realistically
- Strictly follow dietary preferences
- If training regions per day are specified: exercises MUST match exactly those muscle groups

LANGUAGE: All text values in the JSON MUST be in ENGLISH.

Respond ONLY with valid JSON — no Markdown, no code blocks, no explanations.
The JSON must exactly match this schema:

${JSON_SCHEMA}`
}

// ── User prompt ───────────────────────────────────────────────────────────────

function buildPreviousList(plans: FitnessPlan[]): { exercises: string[]; meals: string[] } {
  const exerciseSet = new Set<string>()
  const mealSet = new Set<string>()
  for (const p of plans) {
    for (const day of p.trainingsplan ?? []) {
      for (const ex of day.uebungen ?? []) {
        if (ex.name) exerciseSet.add(ex.name.trim())
      }
    }
    for (const day of p.ernaehrungsplan?.wochentage ?? []) {
      for (const m of day.mahlzeiten ?? []) {
        if (m.name) mealSet.add(m.name.trim())
      }
    }
  }
  return {
    exercises: Array.from(exerciseSet).slice(0, 30),
    meals: Array.from(mealSet).slice(0, 40),
  }
}

function buildUserPrompt(
  profile: ProfileData,
  preferences: PreferencesData,
  lang: 'de' | 'en',
  previousPlans?: FitnessPlan[],
): string {
  const L = lang
  const bmi =
    profile.height && profile.weight
      ? (Number(profile.weight) / Math.pow(Number(profile.height) / 100, 2)).toFixed(1)
      : null

  const dayLabels = preferences.trainingDays
    .map((d) => DAY_SHORT[L][d as keyof (typeof DAY_SHORT)[typeof L]])
    .join(', ')

  const genderLabel = GENDER[L][profile.gender as keyof (typeof GENDER)[typeof L]] ?? profile.gender
  const expLabel = EXPERIENCE[L][profile.experience as keyof (typeof EXPERIENCE)[typeof L]] ?? profile.experience
  const occLabel = OCCUPATION[L][profile.occupation as keyof (typeof OCCUPATION)[typeof L]] ?? profile.occupation
  const gymLabel = GYM[L][preferences.gymType as keyof (typeof GYM)[typeof L]] ?? preferences.gymType
  const goalLabel = GOAL[L][profile.goal as keyof (typeof GOAL)[typeof L]] ?? profile.goal

  const regionsLine = (() => {
    if (preferences.regionsMode === 'ai') {
      return L === 'de'
        ? 'Trainingsregionen pro Tag: KI entscheidet (wähle den optimalen Split basierend auf Ziel und Tagen)'
        : 'Training regions per day: AI decides (choose the optimal split based on goal and days)'
    }
    const lines = preferences.trainingDays.map((d) => {
      const groups = preferences.trainingRegions[d] ?? []
      const dayLabel = DAY_SHORT[L][d as keyof (typeof DAY_SHORT)[typeof L]]
      const groupLabels = groups
        .map((g) => MUSCLE[L][g as keyof (typeof MUSCLE)[typeof L]] ?? g)
        .join(' + ')
      return `  ${dayLabel}: ${groupLabels || (L === 'de' ? '— freie Wahl' : '— free choice')}`
    })
    return (L === 'de'
      ? 'Trainingsregionen pro Tag (PFLICHT — exakt diese Muskelgruppen trainieren):\n'
      : 'Training regions per day (REQUIRED — train exactly these muscle groups):\n') + lines.join('\n')
  })()

  const lines: string[] = []

  if (L === 'de') {
    lines.push(
      '=== ZIEL (WICHTIGSTER PARAMETER) ===',
      `Trainingsziel: ${goalLabel}`,
      '',
      '=== NUTZERPROFIL ===',
      `Größe: ${profile.height} cm`,
      `Gewicht: ${profile.weight} kg`,
      bmi ? `BMI: ${bmi}` : '',
      profile.bodyFat ? `Körperfettanteil: ${profile.bodyFat} % (für präzisere Kalorienberechnung)` : '',
      `Alter: ${profile.age} Jahre`,
      `Geschlecht: ${genderLabel}`,
      `Trainingserfahrung: ${expLabel}`,
      `Beruf / Aktivitätslevel: ${occLabel}`,
      `Tägliche Schritte: ${Number(profile.steps).toLocaleString('de-DE')}`,
      profile.injuries ? `Verletzungen / Einschränkungen: ${profile.injuries}` : '',
      profile.allergies ? `Allergien / Unverträglichkeiten: ${profile.allergies}` : '',
      '',
      '=== TRAINING ===',
      `Trainingstage: ${dayLabels} (${preferences.trainingDays.length}× pro Woche)`,
      `Fitnessstudio-Typ: ${gymLabel}`,
      `Trainingszeit pro Einheit: ${preferences.trainingDuration} Minuten`,
      regionsLine,
      '',
      '=== ERNÄHRUNG ===',
      `Wochenbudget: ${preferences.nutritionBudget} €`,
      `Essenspräferenzen: ${preferences.dietPreferences.join(', ')}`,
      preferences.dislikedIngredients
        ? `STRIKTE AUSSCHLUSSLISTE — diese Zutaten dürfen NIRGENDS vorkommen: ${preferences.dislikedIngredients}`
        : '',
      `Mahlzeiten pro Tag: ${preferences.mealsPerDay} (Array-Länge MUSS exakt eingehalten werden)`,
      `Mahlzeiten-Temperatur: ${
        preferences.mealTemperature === 'warm'
          ? 'WARM — ALLE Mahlzeiten müssen gekochte/warme Gerichte sein. VERBOTEN: Sandwiches, Rohkost als Hauptmahlzeit, unverarbeitete Cold Cuts'
          : preferences.mealTemperature === 'cold'
          ? 'KALT — ALLE Mahlzeiten dürfen kein Kochen/Erhitzen erfordern. Erlaubt: Sandwiches, Salate, Overnight Oats, Joghurt, Müsli, Smoothies, Wraps'
          : 'GEMISCHT — Hauptmahlzeiten (Frühstück, Mittagessen, Abendessen) müssen warm/gekocht sein; Snacks und kleinere Mahlzeiten können kalt/ungekocht sein'
      }`,
      preferences.supplements.length > 0
        ? `Verwendete Supplemente: ${preferences.supplements.join(', ')}`
        : 'Keine Supplemente',
      '',
      '=== AUFGABE ===',
      `1. Trainingsplan für alle ${preferences.trainingDays.length} Trainingstage (passende Übungen für: ${gymLabel})`,
      `2. Vollständiger 7-Tage-Ernährungsplan mit "mahlzeiten"-Array (${preferences.mealsPerDay} Einträge pro Tag)`,
      preferences.supplements.filter((s) => s !== 'none').length > 0
        ? '3. Supplement-Timing nur für die angegebenen Supplemente'
        : '3. Supplement-Timing: leeres Array []',
      '4. Genau 5 allgemeine Tipps als strings',
      '',
      'Berechne kalorien_ziel und Makros mit Mifflin-St-Jeor + Aktivitätsfaktor + Ziel-Anpassung.',
      `Halte Präferenz "${preferences.dietPreferences.join(' / ')}" und Budget ${preferences.nutritionBudget} € / Woche strikt ein.`,
      'WICHTIG: Variiere bewusst — verwende keine Standard-Übungen oder -Rezepte aus vorherigen Generierungen.',
    )
    if (previousPlans && previousPlans.length > 0) {
      const { exercises, meals } = buildPreviousList(previousPlans)
      if (exercises.length > 0) {
        lines.push(
          '',
          '=== BISHERIGE ÜBUNGEN (DIESE BEWUSST VARIIEREN, NICHT KOPIEREN) ===',
          exercises.join(', '),
        )
      }
      if (meals.length > 0) {
        lines.push(
          '',
          '=== BISHERIGE MAHLZEITEN (NEUE NAMEN VERWENDEN) ===',
          meals.join(', '),
        )
      }
    }
  } else {
    lines.push(
      '=== GOAL (MOST IMPORTANT PARAMETER) ===',
      `Training goal: ${goalLabel}`,
      '',
      '=== USER PROFILE ===',
      `Height: ${profile.height} cm`,
      `Weight: ${profile.weight} kg`,
      bmi ? `BMI: ${bmi}` : '',
      profile.bodyFat ? `Body fat: ${profile.bodyFat} % (for more precise calorie calculation)` : '',
      `Age: ${profile.age} years`,
      `Gender: ${genderLabel}`,
      `Training experience: ${expLabel}`,
      `Occupation / Activity level: ${occLabel}`,
      `Daily steps: ${Number(profile.steps).toLocaleString()}`,
      profile.injuries ? `Injuries / Limitations: ${profile.injuries}` : '',
      profile.allergies ? `Allergies / Intolerances: ${profile.allergies}` : '',
      '',
      '=== TRAINING ===',
      `Training days: ${dayLabels} (${preferences.trainingDays.length}× per week)`,
      `Gym type: ${gymLabel}`,
      `Session duration: ${preferences.trainingDuration} minutes`,
      regionsLine,
      '',
      '=== NUTRITION ===',
      `Weekly budget: €${preferences.nutritionBudget}`,
      `Diet preferences: ${preferences.dietPreferences.join(', ')}`,
      preferences.dislikedIngredients
        ? `STRICT EXCLUSION LIST — these ingredients MUST NOT appear ANYWHERE: ${preferences.dislikedIngredients}`
        : '',
      `Meals per day: ${preferences.mealsPerDay} (array length MUST match exactly)`,
      `Meal temperature: ${
        preferences.mealTemperature === 'warm'
          ? 'WARM — ALL meals must be cooked/warm dishes. FORBIDDEN: sandwiches, raw vegetables as main meal, unprocessed cold cuts'
          : preferences.mealTemperature === 'cold'
          ? 'COLD — NO meal may require cooking or heating. Allowed: sandwiches, salads, overnight oats, yogurt, granola, smoothies, wraps'
          : 'MIXED — main meals (breakfast, lunch, dinner) must be warm/cooked; snacks and smaller meals can be cold/uncooked'
      }`,
      preferences.supplements.length > 0
        ? `Supplements used: ${preferences.supplements.join(', ')}`
        : 'No supplements',
      '',
      '=== TASK ===',
      `1. Training plan for all ${preferences.trainingDays.length} training days (exercises suitable for: ${gymLabel})`,
      `2. Complete 7-day nutrition plan with "mahlzeiten" array (${preferences.mealsPerDay} entries per day)`,
      preferences.supplements.filter((s) => s !== 'none').length > 0
        ? '3. Supplement timing for listed supplements only'
        : '3. Supplement timing: empty array []',
      '4. Exactly 5 general tips as strings',
      '',
      'Compute kalorien_ziel and macros via Mifflin-St-Jeor + activity factor + goal adjustment.',
      `Strictly follow "${preferences.dietPreferences.join(' / ')}" preference and weekly budget of €${preferences.nutritionBudget}.`,
      'IMPORTANT: vary deliberately — do not reuse standard exercises or recipes from previous generations.',
    )
    if (previousPlans && previousPlans.length > 0) {
      const { exercises, meals } = buildPreviousList(previousPlans)
      if (exercises.length > 0) {
        lines.push(
          '',
          '=== PREVIOUSLY USED EXERCISES (DELIBERATELY VARY, DO NOT COPY) ===',
          exercises.join(', '),
        )
      }
      if (meals.length > 0) {
        lines.push(
          '',
          '=== PREVIOUSLY USED MEALS (USE NEW NAMES) ===',
          meals.join(', '),
        )
      }
    }
  }

  return lines.filter((l) => l !== '').join('\n')
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generatePlan(
  profile: ProfileData,
  preferences: PreferencesData,
  lang: 'de' | 'en' = 'de',
  previousPlans?: FitnessPlan[],
): Promise<FitnessPlan> {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY
  if (!apiKey) {
    throw new MistralError('missingKey', 'VITE_MISTRAL_API_KEY is not set')
  }

  const mealCountHint =
    preferences.mealsPerDay === '4-5'
      ? lang === 'de' ? 'zwischen 4 und 5' : 'between 4 and 5'
      : lang === 'de' ? `exakt ${preferences.mealsPerDay}` : `exactly ${preferences.mealsPerDay}`

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt(lang, mealCountHint) },
      { role: 'user', content: buildUserPrompt(profile, preferences, lang, previousPlans) },
    ],
    temperature: 0.85,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  })

  const MAX_ATTEMPTS = 3
  let lastError: MistralError = new MistralError('unknown', 'Unknown error')

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await new Promise((r) => setTimeout(r, 1000))
    }

    try {
      let response: Response
      try {
        response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body,
        })
      } catch {
        throw new MistralError('network', 'Network error — Mistral API unreachable')
      }

      if (!response.ok) {
        const responseBody = await response.text().catch(() => '')
        const codeMap: Record<number, MistralErrorCode> = {
          401: 'auth', 403: 'forbidden', 429: 'rateLimit', 500: 'server',
        }
        const code = codeMap[response.status] ?? 'unknown'
        // Don't retry auth/forbidden — they won't succeed on retry
        const noRetry = new MistralError(code, `HTTP ${response.status}: ${responseBody.slice(0, 150)}`, response.status)
        if (code === 'auth' || code === 'forbidden') throw noRetry
        lastError = noRetry
        continue
      }

      let data: unknown
      try {
        data = await response.json()
      } catch {
        lastError = new MistralError('invalidResponse', 'Failed to parse API response as JSON')
        continue
      }

      const content = (data as { choices?: { message?: { content?: string } }[] })
        ?.choices?.[0]?.message?.content

      if (!content) {
        lastError = new MistralError('emptyResponse', 'API returned empty content')
        continue
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        lastError = new MistralError('parseError', `Failed to parse plan JSON: ${content.slice(0, 100)}`)
        continue
      }

      const p = parsed as Record<string, unknown>
      if (
        !Array.isArray(p?.trainingsplan) ||
        !Array.isArray((p?.ernaehrungsplan as Record<string, unknown>)?.wochentage)
      ) {
        lastError = new MistralError('parseError', 'Plan JSON missing required arrays')
        continue
      }

      return parsed as FitnessPlan
    } catch (err) {
      if (err instanceof MistralError) throw err
      lastError = new MistralError('unknown', String(err))
    }
  }

  throw lastError
}
