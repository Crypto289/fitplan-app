import { jsPDF } from 'jspdf'
import type { FitnessPlan } from '../services/mistralService'
import { aggregateIngredients, CATEGORY_ORDER, type IngredientCategory } from './aggregateIngredients'

// ── Layout ────────────────────────────────────────────────────────────────────

const PW = 210, PH = 297      // A4 dimensions (mm)
const ML = 15, MT = 18, MB = 18  // margins
const CW = PW - ML * 2         // content width = 180mm

// Exercise table: col widths sum to 180mm
// #(8) | Name(62) | Sets(14) | Reps(24) | Pause(22) | Equipment(50)
const XN  = ML + 1         // # — left-align
const XE  = ML + 8         // name — left-align
const XSc = ML + 70 + 7    // sets — center of 14mm col
const XRc = ML + 84 + 12   // reps — center of 24mm col
const XPc = ML + 108 + 11  // pause — center of 22mm col
const XQ  = ML + 130       // equipment — left-align

// Supplement table: 45+55+25+55 = 180mm
const SX1 = ML              // supplement
const SX2 = ML + 45         // timing
const SX3 = ML + 100        // amount
const SX4 = ML + 125        // note

// ── Labels ────────────────────────────────────────────────────────────────────

function getLabels(lang: 'de' | 'en') {
  return lang === 'de'
    ? {
        title: 'FitPlan — Dein persönlicher Plan',
        created: 'Erstellt am',
        training: 'Trainingsplan',
        nutrition: 'Ernährungsplan',
        supplements: 'Supplement-Timing',
        tips: 'Allgemeine Tipps',
        exercise: 'Übung',
        sets: 'Sätze',
        reps: 'Wdh.',
        pause: 'Pause',
        equipment: 'Gerät',
        dailyTarget: 'Tagesziel',
        protein: 'Protein',
        carbs: 'KH',
        fat: 'Fett',
        breakfast: 'Frühstück',
        lunch: 'Mittagessen',
        dinner: 'Abendessen',
        supplement: 'Supplement',
        timing: 'Zeitpunkt',
        amount: 'Menge',
        note: 'Hinweis',
      }
    : {
        title: 'FitPlan — Your Personal Plan',
        created: 'Created on',
        training: 'Training Plan',
        nutrition: 'Nutrition Plan',
        supplements: 'Supplement Timing',
        tips: 'General Tips',
        exercise: 'Exercise',
        sets: 'Sets',
        reps: 'Reps',
        pause: 'Rest',
        equipment: 'Equipment',
        dailyTarget: 'Daily Target',
        protein: 'Protein',
        carbs: 'Carbs',
        fat: 'Fat',
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        supplement: 'Supplement',
        timing: 'Timing',
        amount: 'Amount',
        note: 'Note',
      }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportPDF(plan: FitnessPlan, lang: 'de' | 'en' = 'de'): Promise<void> {
  const lbl = getLabels(lang)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const supplements = plan.supplement_timing ?? []
  const tips = plan.allgemeine_tipps ?? []

  let y = MT

  // ── Drawing primitives ────────────────────────────────────────────────────

  function newPage() { pdf.addPage(); y = MT }
  function gap(n: number) { y += n }
  function check(need: number) { if (y + need > PH - MB) newPage() }

  function F(style: 'bold' | 'normal' | 'italic', size: number) {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
  }
  function TC(r: number, g: number, b: number) { pdf.setTextColor(r, g, b) }
  function DC(r: number, g: number, b: number) { pdf.setDrawColor(r, g, b) }
  function LW(w: number) { pdf.setLineWidth(w) }
  function T(text: string, x: number, opts?: { align?: 'left' | 'center' | 'right' }) {
    pdf.text(text, x, y, opts)
  }
  function HL(x1 = ML, x2 = PW - ML) { pdf.line(x1, y, x2, y) }
  function TW(text: string) { return pdf.getTextWidth(text) }

  function clamp(text: string, maxMM: number): string {
    if (TW(text) <= maxMM) return text
    let t = text
    while (t.length > 0 && TW(t + '…') > maxMM) t = t.slice(0, -1)
    return t.length > 0 ? t + '…' : text.slice(0, 3)
  }

  // ── Document header ───────────────────────────────────────────────────────

  F('bold', 18); TC(10, 10, 10)
  T(lbl.title, ML)
  gap(7)

  F('normal', 9); TC(120, 120, 120)
  T(`${lbl.created}: ${new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}`, ML)
  gap(4.5)

  LW(0.5); DC(0, 153, 68); HL()
  gap(10)

  // ── Section header ────────────────────────────────────────────────────────

  let secNum = 1

  function sectionHeader(title: string) {
    check(16)
    const num = String(secNum++).padStart(2, '0')
    F('bold', 9); TC(0, 153, 68)
    T(num, ML)
    TC(15, 15, 15)
    T(title.toUpperCase(), ML + 9)
    gap(4)
    LW(0.3); DC(205, 205, 205); HL()
    gap(7)
  }

  // ── Training section ──────────────────────────────────────────────────────

  sectionHeader(lbl.training)

  for (const day of plan.trainingsplan) {
    check(24)  // ensure at least header + table-header + 1 row fit

    // Day header
    F('bold', 10.5); TC(17, 17, 17)
    T(day.tag, ML)
    const tagW = TW(day.tag)
    F('normal', 9); TC(100, 100, 100)
    T(` — ${day.focus}`, ML + tagW)
    gap(5.5)

    // Table header
    F('bold', 7.5); TC(75, 75, 75)
    T('#', XN)
    T(lbl.exercise, XE)
    T(lbl.sets,      XSc, { align: 'center' })
    T(lbl.reps,      XRc, { align: 'center' })
    T(lbl.pause,     XPc, { align: 'center' })
    T(lbl.equipment, XQ)
    gap(2.5)
    LW(0.3); DC(195, 195, 195); HL()
    gap(4.5)

    // Exercise rows
    for (let i = 0; i < day.uebungen.length; i++) {
      const ex = day.uebungen[i]
      const descLines = ex.beschreibung
        ? pdf.splitTextToSize(ex.beschreibung, CW - 12)
        : []
      const rowH = 6 + (descLines.length > 0 ? descLines.length * 3.8 + 2.5 : 0)
      check(rowH)

      F('normal', 8); TC(175, 175, 175)
      T(String(i + 1), XN)

      F('bold', 9); TC(17, 17, 17)
      T(clamp(ex.name, 60), XE)

      F('normal', 9); TC(30, 30, 30)
      T(clamp(String(ex.sets), 12),     XSc, { align: 'center' })
      T(clamp(ex.wiederholungen, 22),   XRc, { align: 'center' })
      T(clamp(ex.pause, 20),            XPc, { align: 'center' })
      T(clamp(ex.maschine, 49),         XQ)

      gap(2.5)
      LW(0.2); DC(232, 232, 232); HL()
      gap(4)

      if (descLines.length > 0) {
        F('italic', 8.5); TC(115, 115, 115)
        pdf.text(descLines as string[], XE + 2, y)
        gap(descLines.length * 3.8 + 2.5)
      }
    }

    gap(5)  // spacing between days
  }

  // ── Nutrition section ─────────────────────────────────────────────────────

  sectionHeader(lbl.nutrition)

  // Macro overview
  const np = plan.ernaehrungsplan
  const macroLine = `${lbl.dailyTarget}: ${np.kalorien_ziel} kcal   ${lbl.protein}: ${np.protein_g}g   ${lbl.carbs}: ${np.kohlenhydrate_g}g   ${lbl.fat}: ${np.fett_g}g`
  check(9)
  F('bold', 9); TC(0, 120, 55)
  T(macroLine, ML)
  gap(4)
  LW(0.2); DC(185, 225, 200); HL()
  gap(7)

  // Nutrition days
  for (const day of np.wochentage) {
    check(20)

    F('bold', 10.5); TC(17, 17, 17)
    T(day.tag, ML)
    gap(5.5)

    for (const meal of day.mahlzeiten) {
      const ingrLines = pdf.splitTextToSize(meal.zutaten.join(' · '), CW - 28)
      const mealH = 5 + ingrLines.length * 3.6 + 2.5
      check(mealH)

      const kcalStr = `${meal.kalorien} kcal`
      const typeLabel = clamp(meal.typ.toUpperCase(), 26)

      F('bold', 8); TC(0, 140, 65)
      T(typeLabel, ML)

      F('bold', 9.5); TC(17, 17, 17)
      const nameMaxW = CW - 28 - TW(kcalStr) - 4
      T(clamp(meal.name, nameMaxW), ML + 28)

      F('normal', 8.5); TC(150, 150, 150)
      T(kcalStr, PW - ML, { align: 'right' })
      gap(4.5)

      F('italic', 8.5); TC(115, 115, 115)
      pdf.text(ingrLines as string[], ML + 28, y)
      gap(ingrLines.length * 3.6 + 3)
    }

    gap(4)
  }

  // ── Supplement section ────────────────────────────────────────────────────

  if (supplements.length > 0) {
    sectionHeader(lbl.supplements)

    // Table header
    F('bold', 7.5); TC(75, 75, 75)
    T(lbl.supplement, SX1)
    T(lbl.timing,     SX2)
    T(lbl.amount,     SX3)
    T(lbl.note,       SX4)
    gap(2.5)
    LW(0.3); DC(195, 195, 195); HL()
    gap(4.5)

    for (const s of supplements) {
      check(8)

      F('bold', 9); TC(17, 17, 17)
      T(clamp(s.supplement, 43), SX1)

      F('normal', 9); TC(30, 30, 30)
      T(clamp(s.zeitpunkt, 53), SX2)

      F('bold', 9); TC(0, 120, 55)
      T(clamp(s.menge, 23), SX3)

      F('italic', 8.5); TC(105, 105, 105)
      T(clamp(s.hinweis, 53), SX4)

      gap(2.5)
      LW(0.2); DC(232, 232, 232); HL()
      gap(4.5)
    }

    gap(3)
  }

  // ── Tips section ──────────────────────────────────────────────────────────

  if (tips.length > 0) {
    sectionHeader(lbl.tips)

    for (let i = 0; i < tips.length; i++) {
      const lines = pdf.splitTextToSize(tips[i], CW - 9) as string[]
      check(lines.length * 4.5 + 3)

      F('bold', 9.5); TC(0, 153, 68)
      T(`${i + 1}.`, ML)

      F('normal', 9.5); TC(40, 40, 40)
      pdf.text(lines, ML + 9, y)
      gap(lines.length * 4.5 + 3)
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  pdf.save(`fitplan-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Shopping list export ─────────────────────────────────────────────────────

function getShoppingLabels(lang: 'de' | 'en') {
  return lang === 'de'
    ? {
        title: 'FitPlan — Einkaufsliste',
        created: 'Erstellt am',
        empty: 'Keine Zutaten vorhanden',
        cats: {
          protein: 'Proteine',
          carbs: 'Kohlenhydrate',
          veggies: 'Gemüse & Obst',
          dairy: 'Milchprodukte',
          other: 'Sonstiges',
        } as Record<IngredientCategory, string>,
      }
    : {
        title: 'FitPlan — Shopping List',
        created: 'Created on',
        empty: 'No ingredients found',
        cats: {
          protein: 'Proteins',
          carbs: 'Carbs',
          veggies: 'Vegetables & Fruit',
          dairy: 'Dairy',
          other: 'Other',
        } as Record<IngredientCategory, string>,
      }
}

export async function exportShoppingList(plan: FitnessPlan, lang: 'de' | 'en' = 'de'): Promise<void> {
  const lbl = getShoppingLabels(lang)
  const grouped = aggregateIngredients(plan)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = MT

  function newPage() { pdf.addPage(); y = MT }
  function gap(n: number) { y += n }
  function check(need: number) { if (y + need > PH - MB) newPage() }
  function F(style: 'bold' | 'normal' | 'italic', size: number) {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
  }
  function TC(r: number, g: number, b: number) { pdf.setTextColor(r, g, b) }
  function DC(r: number, g: number, b: number) { pdf.setDrawColor(r, g, b) }
  function LW(w: number) { pdf.setLineWidth(w) }
  function T(text: string, x: number, opts?: { align?: 'left' | 'center' | 'right' }) {
    pdf.text(text, x, y, opts)
  }
  function HL(x1 = ML, x2 = PW - ML) { pdf.line(x1, y, x2, y) }

  // Document header
  F('bold', 18); TC(10, 10, 10)
  T(lbl.title, ML)
  gap(7)

  F('normal', 9); TC(120, 120, 120)
  T(`${lbl.created}: ${new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB')}`, ML)
  gap(4.5)

  LW(0.5); DC(232, 146, 42); HL()
  gap(10)

  // Empty state
  const totalItems = CATEGORY_ORDER.reduce((sum, c) => sum + grouped[c].length, 0)
  if (totalItems === 0) {
    F('italic', 11); TC(120, 120, 120)
    T(lbl.empty, ML)
    pdf.save(`einkaufsliste-${new Date().toISOString().slice(0, 10)}.pdf`)
    return
  }

  let secNum = 1
  function sectionHeader(title: string) {
    check(16)
    const num = String(secNum++).padStart(2, '0')
    F('bold', 9); TC(232, 146, 42)
    T(num, ML)
    TC(15, 15, 15)
    T(title.toUpperCase(), ML + 9)
    gap(4)
    LW(0.3); DC(205, 205, 205); HL()
    gap(7)
  }

  // Two-column item layout
  const COL_W = (CW - 6) / 2
  const COL_X = [ML, ML + COL_W + 6]
  const ROW_H = 6

  for (const cat of CATEGORY_ORDER) {
    const items = grouped[cat]
    if (items.length === 0) continue

    sectionHeader(lbl.cats[cat])

    // Pair items across two columns
    for (let i = 0; i < items.length; i += 2) {
      check(ROW_H)
      const left = items[i]
      const right = items[i + 1]

      F('normal', 10); TC(35, 35, 35)
      T(`•  ${left.display}`, COL_X[0])
      if (right) T(`•  ${right.display}`, COL_X[1])
      gap(ROW_H)
    }

    gap(4)
  }

  pdf.save(`einkaufsliste-${new Date().toISOString().slice(0, 10)}.pdf`)
}
