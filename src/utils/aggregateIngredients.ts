import type { FitnessPlan } from '../services/mistralService'

export type IngredientCategory = 'protein' | 'dairy' | 'veggies' | 'carbs' | 'spices' | 'other'

export const CATEGORY_ORDER: IngredientCategory[] = ['protein', 'carbs', 'veggies', 'dairy', 'spices', 'other']

export interface AggregatedIngredient {
  name: string
  quantity: number
  unit: string
  display: string
  category: IngredientCategory
}

const UNIT_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|el|tl|stk|stück|tbsp|tsp|piece|pieces|x)?\s+(.+)$/i

const KEYWORDS: Record<Exclude<IngredientCategory, 'other'>, string[]> = {
  spices: [
    'kurkuma', 'zimt', 'salz', 'pfeffer', 'gewürz', 'spice',
    'zitrone', 'lemon', 'limette', 'lime',
    'essig', 'vinegar',
    'petersilie', 'parsley', 'basilikum', 'basil', 'oregano',
    'thymian', 'thyme', 'ingwer', 'ginger', 'vanille', 'vanilla',
    'senf', 'mustard', 'sojasoße', 'soy sauce',
  ],
  // Order of resolution: protein → dairy → veggies → carbs → other
  // (Hüttenkäse contains "käse" → would otherwise hit dairy; we match protein first.)
  protein: [
    'huhn', 'hähnchen', 'chicken', 'pute', 'turkey', 'rind', 'beef', 'steak',
    'schwein', 'pork', 'speck', 'bacon', 'schinken', 'ham', 'wurst', 'sausage',
    'lachs', 'salmon', 'thunfisch', 'tuna', 'fisch', 'fish', 'shrimp', 'garnele',
    'ei ', 'eier', 'egg', 'tofu', 'tempeh', 'seitan',
    'linsen', 'lentil', 'kichererbse', 'chickpea', 'bohnen', 'beans', 'kidneybohne',
    'quark', 'skyr', 'hüttenkäse', 'cottage cheese', 'magerquark',
    'whey', 'eiweißpulver', 'protein pulver', 'protein powder', 'eiweiß',
  ],
  dairy: [
    'milch', 'milk', 'joghurt', 'yogurt', 'käse', 'cheese',
    'butter', 'sahne', 'cream', 'frischkäse', 'feta', 'mozzarella',
    'parmesan', 'gouda', 'cheddar', 'ricotta',
  ],
  veggies: [
    'spinat', 'spinach', 'brokkoli', 'broccoli', 'blumenkohl', 'cauliflower',
    'paprika', 'pepper', 'tomate', 'tomato', 'gurke', 'cucumber',
    'salat', 'lettuce', 'rucola', 'arugula',
    'zwiebel', 'onion', 'knoblauch', 'garlic', 'lauch', 'leek',
    'karotte', 'möhre', 'carrot', 'zucchini', 'aubergine', 'eggplant',
    'pilz', 'mushroom', 'champignon',
    'beere', 'berry', 'berries', 'blaubeere', 'blueberry', 'erdbeere', 'strawberry',
    'himbeere', 'raspberry', 'banane', 'banana', 'apfel', 'apple',
    'birne', 'pear', 'orange', 'apfelsine', 'mandarine', 'tangerine',
    'avocado', 'kürbis', 'pumpkin', 'spargel', 'asparagus',
    'erbsen', 'pea', 'mais', 'corn', 'rote bete', 'beetroot',
    'sellerie', 'celery', 'kohl', 'cabbage', 'rosenkohl',
  ],
  carbs: [
    'reis', 'rice', 'pasta', 'nudel', 'noodle', 'spaghetti',
    'brot', 'bread', 'toast', 'brötchen', 'roll', 'baguette',
    'hafer', 'oat', 'müsli', 'granola', 'cornflake',
    'kartoffel', 'potato', 'süßkartoffel', 'sweet potato',
    'quinoa', 'couscous', 'bulgur', 'mehl', 'flour',
    'tortilla', 'wrap', 'pita', 'cracker', 'reiswaffel',
  ],
}

function categorize(rawName: string): IngredientCategory {
  const name = rawName.toLowerCase()
  for (const cat of ['protein', 'dairy', 'veggies', 'carbs', 'spices'] as const) {
    if (KEYWORDS[cat].some((kw) => name.includes(kw))) return cat
  }
  return 'other'
}

interface ParsedIngredient {
  quantity: number
  unit: string
  name: string
}

function parseIngredient(line: string): ParsedIngredient {
  const trimmed = line.trim()
  if (!trimmed) return { quantity: 0, unit: '', name: '' }
  const m = UNIT_PATTERN.exec(trimmed)
  if (!m) {
    return { quantity: 1, unit: '', name: trimmed }
  }
  const qty = Number(m[1].replace(',', '.'))
  const unit = (m[2] ?? '').toLowerCase()
  const name = m[3].trim()
  return { quantity: Number.isFinite(qty) ? qty : 1, unit, name }
}

function formatQuantity(q: number): string {
  if (Number.isInteger(q)) return String(q)
  return q.toFixed(1).replace(/\.0$/, '')
}

function formatDisplay(parsed: { quantity: number; unit: string; name: string }): string {
  const q = formatQuantity(parsed.quantity)
  const sep = parsed.unit && parsed.unit.length > 2 ? ' ' : ''
  if (!parsed.unit) return `${q} ${parsed.name}`
  return `${q}${sep}${parsed.unit} ${parsed.name}`
}

export function aggregateIngredients(
  plan: FitnessPlan,
): Record<IngredientCategory, AggregatedIngredient[]> {
  const map = new Map<string, ParsedIngredient & { firstName: string }>()

  const days = plan.ernaehrungsplan?.wochentage ?? []
  for (const day of days) {
    for (const meal of day.mahlzeiten ?? []) {
      for (const z of meal.zutaten ?? []) {
        const parsed = parseIngredient(z)
        if (!parsed.name) continue
        const key = `${parsed.name.toLowerCase()}|${parsed.unit.toLowerCase()}`
        const existing = map.get(key)
        if (existing) {
          existing.quantity += parsed.quantity
        } else {
          map.set(key, { ...parsed, firstName: parsed.name })
        }
      }
    }
  }

  const result: Record<IngredientCategory, AggregatedIngredient[]> = {
    protein: [], carbs: [], veggies: [], dairy: [], spices: [], other: [],
  }

  for (const entry of map.values()) {
    const category = categorize(entry.firstName)
    result[category].push({
      name: entry.firstName,
      quantity: entry.quantity,
      unit: entry.unit,
      display: formatDisplay({ quantity: entry.quantity, unit: entry.unit, name: entry.firstName }),
      category,
    })
  }

  for (const cat of CATEGORY_ORDER) {
    result[cat].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }

  return result
}
