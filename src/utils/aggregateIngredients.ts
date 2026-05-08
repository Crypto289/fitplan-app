import type { FitnessPlan } from '../services/mistralService'

export type IngredientCategory =
  | 'produce'
  | 'meat_fish'
  | 'dairy_eggs'
  | 'dry_goods'
  | 'spices_sauces'
  | 'other'

export const CATEGORY_ORDER: IngredientCategory[] = [
  'produce',
  'meat_fish',
  'dairy_eggs',
  'dry_goods',
  'spices_sauces',
  'other',
]

export interface AggregatedIngredient {
  name: string
  quantity: number
  unit: string
  display: string
  category: IngredientCategory
}

const UNIT_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|el|tl|stk|stück|tbsp|tsp|piece|pieces|x)?\s+(.+)$/i

const KEYWORDS: Record<Exclude<IngredientCategory, 'other'>, string[]> = {
  // Resolution order: meat_fish → dairy_eggs → dry_goods → spices_sauces → produce → other.
  // Compound names like "Hähnchenwurst" hit meat first; "Tomatensoße" matches "soße" before
  // "tomate" so it lands in spices_sauces; fresh "Tomate" falls through to produce.
  meat_fish: [
    'huhn', 'hähnchen', 'chicken', 'pute', 'turkey',
    'rind', 'beef', 'steak', 'hackfleisch', 'mince', 'ground meat',
    'schwein', 'pork', 'speck', 'bacon', 'schinken', 'ham',
    'wurst', 'sausage', 'salami', 'lamm', 'lamb',
    'lachs', 'salmon', 'thunfisch', 'tuna', 'fisch', 'fish',
    'shrimp', 'garnele', 'kabeljau', 'cod', 'hering', 'herring',
    'makrele', 'mackerel', 'forelle', 'trout', 'sardine',
  ],
  dairy_eggs: [
    'frischkäse', 'feta', 'mozzarella', 'parmesan', 'gouda', 'cheddar', 'ricotta',
    'käse', 'cheese',
    'milch', 'milk', 'joghurt', 'yogurt',
    'butter', 'sahne', 'cream',
    'magerquark', 'hüttenkäse', 'cottage cheese', 'quark', 'skyr',
    'eier', 'egg',
    // Singular "Ei" — use space-padded matching so it does not collide with
    // "Olivenöl", "Eiweißpulver", or other substrings containing "ei".
    'ei,', ' ei ',
  ],
  dry_goods: [
    'reis', 'rice', 'pasta', 'nudel', 'noodle', 'spaghetti',
    'brot', 'bread', 'toast', 'brötchen', 'roll', 'baguette',
    'hafer', 'oat', 'müsli', 'granola', 'cornflake',
    'quinoa', 'couscous', 'bulgur', 'mehl', 'flour',
    'tortilla', 'wrap', 'pita', 'cracker', 'reiswaffel',
    'linsen', 'lentil', 'kichererbse', 'chickpea',
    'bohnen', 'beans', 'kidneybohne',
    'tofu', 'tempeh', 'seitan',
    'whey', 'eiweißpulver', 'protein pulver', 'protein powder', 'eiweiß',
    'mandel', 'almond', 'walnuss', 'walnut', 'cashew',
    'haselnuss', 'hazelnut', 'erdnuss', 'peanut', 'pistazie', 'pistachio',
    'nuss', 'nut',
    'kürbiskern', 'sonnenblumenkern', 'leinsamen', 'flaxseed',
    'chiasamen', 'chia samen', 'chia seed', 'samen', 'seed',
    'rosine', 'raisin', 'dattel', 'date',
  ],
  spices_sauces: [
    'kurkuma', 'zimt', 'salz', 'pfeffer', 'gewürz', 'spice',
    'vanille', 'vanilla', 'paprikapulver', 'chili', 'curry',
    'muskat', 'nutmeg', 'kümmel', 'cumin',
    'olivenöl', 'olive oil', 'kokosöl', 'coconut oil',
    'rapsöl', 'sonnenblumenöl', 'sunflower oil', 'leinöl',
    'öl', 'oil',
    'essig', 'vinegar', 'balsamico',
    'senf', 'mustard',
    'sojasoße', 'sojasauce', 'soy sauce',
    'ketchup', 'mayo', 'mayonnaise',
    'soße', 'sauce', 'salsa', 'pesto', 'hummus', 'tahini',
    'honig', 'honey', 'ahornsirup', 'maple syrup',
    'agavendicksaft', 'agave', 'zucker', 'sugar',
    'brühe', 'broth', 'bouillon', 'fond',
  ],
  produce: [
    // veggies
    'spinat', 'spinach', 'brokkoli', 'broccoli',
    'blumenkohl', 'cauliflower',
    'paprika', 'pepper', 'tomate', 'tomato', 'gurke', 'cucumber',
    'salat', 'lettuce', 'rucola', 'arugula',
    'zwiebel', 'onion', 'knoblauch', 'garlic', 'lauch', 'leek',
    'karotte', 'möhre', 'carrot', 'zucchini', 'aubergine', 'eggplant',
    'pilz', 'mushroom', 'champignon',
    'kürbis', 'pumpkin', 'spargel', 'asparagus',
    'erbsen', 'pea', 'mais', 'corn', 'rote bete', 'beetroot',
    'sellerie', 'celery', 'kohl', 'cabbage', 'rosenkohl',
    'kartoffel', 'potato', 'süßkartoffel', 'sweet potato',
    // fruits
    'beere', 'berry', 'berries', 'blaubeere', 'blueberry',
    'erdbeere', 'strawberry', 'himbeere', 'raspberry',
    'banane', 'banana', 'apfel', 'apple', 'birne', 'pear',
    'orange', 'apfelsine', 'mandarine', 'tangerine',
    'avocado', 'zitrone', 'lemon', 'limette', 'lime',
    'traube', 'grape', 'melone', 'melon', 'ananas', 'pineapple',
    'kiwi', 'mango', 'pfirsich', 'peach', 'kirsche', 'cherry',
    // fresh herbs
    'petersilie', 'parsley', 'basilikum', 'basil', 'oregano',
    'thymian', 'thyme', 'schnittlauch', 'chive',
    'koriander', 'cilantro', 'dill', 'rosmarin', 'rosemary',
    'salbei', 'sage', 'minze', 'mint',
    // root
    'ingwer', 'ginger',
  ],
}

function categorize(rawName: string): IngredientCategory {
  const name = rawName.toLowerCase()
  const padded = ` ${name} `
  for (const cat of ['meat_fish', 'dairy_eggs', 'dry_goods', 'spices_sauces', 'produce'] as const) {
    if (
      KEYWORDS[cat].some((kw) =>
        kw.startsWith(' ') || kw.endsWith(' ') ? padded.includes(kw) : name.includes(kw),
      )
    ) {
      return cat
    }
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
    produce: [], meat_fish: [], dairy_eggs: [], dry_goods: [], spices_sauces: [], other: [],
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
