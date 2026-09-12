// src/data/periodicTable.ts
//
// Static reference data — all 118 confirmed elements. Classification into
// metal / nonmetal / metalloid follows the commonly-taught convention
// (Boron, Silicon, Germanium, Arsenic, Antimony, Tellurium, Polonium and
// Astatine as the metalloid "staircase"). A few of the heaviest synthetic
// elements (113-118) have only ever been produced a handful of atoms at a
// time and their chemistry is partly predicted rather than observed —
// they're placed by their expected group behaviour, same as most teaching
// periodic tables do.
//
// `period`/`group` place each element in the main 18-column grid. The
// lanthanides (58-71) and actinides (90-103) are pulled out of the main
// grid into their own two footnote rows, exactly like a printed periodic
// table — `footnoteRow` marks which of those two rows they belong to, and
// `footnoteIndex` is their left-to-right position in that row.
//
// `approxMass` is set for elements with no naturally-stable isotope and
// therefore no fixed IUPAC standard atomic weight — the mass shown for
// those is the mass number of the longest-lived known isotope, not a
// true average, so the UI marks it with a "~".

export type ElementCategory = 'metal' | 'nonmetal' | 'metalloid'

export interface PeriodicElement {
  number: number
  symbol: string
  name: string
  mass: number
  category: ElementCategory
  period: number
  group: number
  footnoteRow?: 'lanthanide' | 'actinide'
  footnoteIndex?: number
  approxMass?: boolean
}

export const CATEGORY_LABEL: Record<ElementCategory, string> = {
  metal: 'Metal',
  nonmetal: 'Nonmetal',
  metalloid: 'Metalloid',
}

export const CATEGORY_COLOR: Record<ElementCategory, { bg: string; border: string; text: string }> = {
  metal: { bg: '#B5624B1A', border: '#B5624B66', text: '#8A4433' },
  nonmetal: { bg: '#2F6F6E1A', border: '#2F6F6E66', text: '#1F4B4A' },
  metalloid: { bg: '#C98A1D1A', border: '#C98A1D66', text: '#8A5E12' },
}

export const PERIODIC_TABLE: PeriodicElement[] = [
  { number: 1, symbol: 'H', name: 'Hydrogen', mass: 1.008, category: 'nonmetal', period: 1, group: 1 },
  { number: 2, symbol: 'He', name: 'Helium', mass: 4.003, category: 'nonmetal', period: 1, group: 18 },

  { number: 3, symbol: 'Li', name: 'Lithium', mass: 6.94, category: 'metal', period: 2, group: 1 },
  { number: 4, symbol: 'Be', name: 'Beryllium', mass: 9.012, category: 'metal', period: 2, group: 2 },
  { number: 5, symbol: 'B', name: 'Boron', mass: 10.81, category: 'metalloid', period: 2, group: 13 },
  { number: 6, symbol: 'C', name: 'Carbon', mass: 12.011, category: 'nonmetal', period: 2, group: 14 },
  { number: 7, symbol: 'N', name: 'Nitrogen', mass: 14.007, category: 'nonmetal', period: 2, group: 15 },
  { number: 8, symbol: 'O', name: 'Oxygen', mass: 15.999, category: 'nonmetal', period: 2, group: 16 },
  { number: 9, symbol: 'F', name: 'Fluorine', mass: 18.998, category: 'nonmetal', period: 2, group: 17 },
  { number: 10, symbol: 'Ne', name: 'Neon', mass: 20.180, category: 'nonmetal', period: 2, group: 18 },

  { number: 11, symbol: 'Na', name: 'Sodium', mass: 22.990, category: 'metal', period: 3, group: 1 },
  { number: 12, symbol: 'Mg', name: 'Magnesium', mass: 24.305, category: 'metal', period: 3, group: 2 },
  { number: 13, symbol: 'Al', name: 'Aluminium', mass: 26.982, category: 'metal', period: 3, group: 13 },
  { number: 14, symbol: 'Si', name: 'Silicon', mass: 28.085, category: 'metalloid', period: 3, group: 14 },
  { number: 15, symbol: 'P', name: 'Phosphorus', mass: 30.974, category: 'nonmetal', period: 3, group: 15 },
  { number: 16, symbol: 'S', name: 'Sulfur', mass: 32.06, category: 'nonmetal', period: 3, group: 16 },
  { number: 17, symbol: 'Cl', name: 'Chlorine', mass: 35.45, category: 'nonmetal', period: 3, group: 17 },
  { number: 18, symbol: 'Ar', name: 'Argon', mass: 39.948, category: 'nonmetal', period: 3, group: 18 },

  { number: 19, symbol: 'K', name: 'Potassium', mass: 39.098, category: 'metal', period: 4, group: 1 },
  { number: 20, symbol: 'Ca', name: 'Calcium', mass: 40.078, category: 'metal', period: 4, group: 2 },
  { number: 21, symbol: 'Sc', name: 'Scandium', mass: 44.956, category: 'metal', period: 4, group: 3 },
  { number: 22, symbol: 'Ti', name: 'Titanium', mass: 47.867, category: 'metal', period: 4, group: 4 },
  { number: 23, symbol: 'V', name: 'Vanadium', mass: 50.942, category: 'metal', period: 4, group: 5 },
  { number: 24, symbol: 'Cr', name: 'Chromium', mass: 51.996, category: 'metal', period: 4, group: 6 },
  { number: 25, symbol: 'Mn', name: 'Manganese', mass: 54.938, category: 'metal', period: 4, group: 7 },
  { number: 26, symbol: 'Fe', name: 'Iron', mass: 55.845, category: 'metal', period: 4, group: 8 },
  { number: 27, symbol: 'Co', name: 'Cobalt', mass: 58.933, category: 'metal', period: 4, group: 9 },
  { number: 28, symbol: 'Ni', name: 'Nickel', mass: 58.693, category: 'metal', period: 4, group: 10 },
  { number: 29, symbol: 'Cu', name: 'Copper', mass: 63.546, category: 'metal', period: 4, group: 11 },
  { number: 30, symbol: 'Zn', name: 'Zinc', mass: 65.38, category: 'metal', period: 4, group: 12 },
  { number: 31, symbol: 'Ga', name: 'Gallium', mass: 69.723, category: 'metal', period: 4, group: 13 },
  { number: 32, symbol: 'Ge', name: 'Germanium', mass: 72.630, category: 'metalloid', period: 4, group: 14 },
  { number: 33, symbol: 'As', name: 'Arsenic', mass: 74.922, category: 'metalloid', period: 4, group: 15 },
  { number: 34, symbol: 'Se', name: 'Selenium', mass: 78.971, category: 'nonmetal', period: 4, group: 16 },
  { number: 35, symbol: 'Br', name: 'Bromine', mass: 79.904, category: 'nonmetal', period: 4, group: 17 },
  { number: 36, symbol: 'Kr', name: 'Krypton', mass: 83.798, category: 'nonmetal', period: 4, group: 18 },

  { number: 37, symbol: 'Rb', name: 'Rubidium', mass: 85.468, category: 'metal', period: 5, group: 1 },
  { number: 38, symbol: 'Sr', name: 'Strontium', mass: 87.62, category: 'metal', period: 5, group: 2 },
  { number: 39, symbol: 'Y', name: 'Yttrium', mass: 88.906, category: 'metal', period: 5, group: 3 },
  { number: 40, symbol: 'Zr', name: 'Zirconium', mass: 91.224, category: 'metal', period: 5, group: 4 },
  { number: 41, symbol: 'Nb', name: 'Niobium', mass: 92.906, category: 'metal', period: 5, group: 5 },
  { number: 42, symbol: 'Mo', name: 'Molybdenum', mass: 95.95, category: 'metal', period: 5, group: 6 },
  { number: 43, symbol: 'Tc', name: 'Technetium', mass: 98, category: 'metal', period: 5, group: 7, approxMass: true },
  { number: 44, symbol: 'Ru', name: 'Ruthenium', mass: 101.07, category: 'metal', period: 5, group: 8 },
  { number: 45, symbol: 'Rh', name: 'Rhodium', mass: 102.906, category: 'metal', period: 5, group: 9 },
  { number: 46, symbol: 'Pd', name: 'Palladium', mass: 106.42, category: 'metal', period: 5, group: 10 },
  { number: 47, symbol: 'Ag', name: 'Silver', mass: 107.868, category: 'metal', period: 5, group: 11 },
  { number: 48, symbol: 'Cd', name: 'Cadmium', mass: 112.414, category: 'metal', period: 5, group: 12 },
  { number: 49, symbol: 'In', name: 'Indium', mass: 114.818, category: 'metal', period: 5, group: 13 },
  { number: 50, symbol: 'Sn', name: 'Tin', mass: 118.710, category: 'metal', period: 5, group: 14 },
  { number: 51, symbol: 'Sb', name: 'Antimony', mass: 121.760, category: 'metalloid', period: 5, group: 15 },
  { number: 52, symbol: 'Te', name: 'Tellurium', mass: 127.60, category: 'metalloid', period: 5, group: 16 },
  { number: 53, symbol: 'I', name: 'Iodine', mass: 126.904, category: 'nonmetal', period: 5, group: 17 },
  { number: 54, symbol: 'Xe', name: 'Xenon', mass: 131.293, category: 'nonmetal', period: 5, group: 18 },

  { number: 55, symbol: 'Cs', name: 'Caesium', mass: 132.905, category: 'metal', period: 6, group: 1 },
  { number: 56, symbol: 'Ba', name: 'Barium', mass: 137.327, category: 'metal', period: 6, group: 2 },
  { number: 57, symbol: 'La', name: 'Lanthanum', mass: 138.905, category: 'metal', period: 6, group: 3 },
  { number: 72, symbol: 'Hf', name: 'Hafnium', mass: 178.49, category: 'metal', period: 6, group: 4 },
  { number: 73, symbol: 'Ta', name: 'Tantalum', mass: 180.948, category: 'metal', period: 6, group: 5 },
  { number: 74, symbol: 'W', name: 'Tungsten', mass: 183.84, category: 'metal', period: 6, group: 6 },
  { number: 75, symbol: 'Re', name: 'Rhenium', mass: 186.207, category: 'metal', period: 6, group: 7 },
  { number: 76, symbol: 'Os', name: 'Osmium', mass: 190.23, category: 'metal', period: 6, group: 8 },
  { number: 77, symbol: 'Ir', name: 'Iridium', mass: 192.217, category: 'metal', period: 6, group: 9 },
  { number: 78, symbol: 'Pt', name: 'Platinum', mass: 195.084, category: 'metal', period: 6, group: 10 },
  { number: 79, symbol: 'Au', name: 'Gold', mass: 196.967, category: 'metal', period: 6, group: 11 },
  { number: 80, symbol: 'Hg', name: 'Mercury', mass: 200.592, category: 'metal', period: 6, group: 12 },
  { number: 81, symbol: 'Tl', name: 'Thallium', mass: 204.38, category: 'metal', period: 6, group: 13 },
  { number: 82, symbol: 'Pb', name: 'Lead', mass: 207.2, category: 'metal', period: 6, group: 14 },
  { number: 83, symbol: 'Bi', name: 'Bismuth', mass: 208.980, category: 'metal', period: 6, group: 15 },
  { number: 84, symbol: 'Po', name: 'Polonium', mass: 209, category: 'metalloid', period: 6, group: 16, approxMass: true },
  { number: 85, symbol: 'At', name: 'Astatine', mass: 210, category: 'metalloid', period: 6, group: 17, approxMass: true },
  { number: 86, symbol: 'Rn', name: 'Radon', mass: 222, category: 'nonmetal', period: 6, group: 18, approxMass: true },

  { number: 87, symbol: 'Fr', name: 'Francium', mass: 223, category: 'metal', period: 7, group: 1, approxMass: true },
  { number: 88, symbol: 'Ra', name: 'Radium', mass: 226, category: 'metal', period: 7, group: 2, approxMass: true },
  { number: 89, symbol: 'Ac', name: 'Actinium', mass: 227, category: 'metal', period: 7, group: 3, approxMass: true },
  { number: 104, symbol: 'Rf', name: 'Rutherfordium', mass: 267, category: 'metal', period: 7, group: 4, approxMass: true },
  { number: 105, symbol: 'Db', name: 'Dubnium', mass: 268, category: 'metal', period: 7, group: 5, approxMass: true },
  { number: 106, symbol: 'Sg', name: 'Seaborgium', mass: 269, category: 'metal', period: 7, group: 6, approxMass: true },
  { number: 107, symbol: 'Bh', name: 'Bohrium', mass: 270, category: 'metal', period: 7, group: 7, approxMass: true },
  { number: 108, symbol: 'Hs', name: 'Hassium', mass: 269, category: 'metal', period: 7, group: 8, approxMass: true },
  { number: 109, symbol: 'Mt', name: 'Meitnerium', mass: 278, category: 'metal', period: 7, group: 9, approxMass: true },
  { number: 110, symbol: 'Ds', name: 'Darmstadtium', mass: 281, category: 'metal', period: 7, group: 10, approxMass: true },
  { number: 111, symbol: 'Rg', name: 'Roentgenium', mass: 282, category: 'metal', period: 7, group: 11, approxMass: true },
  { number: 112, symbol: 'Cn', name: 'Copernicium', mass: 285, category: 'metal', period: 7, group: 12, approxMass: true },
  { number: 113, symbol: 'Nh', name: 'Nihonium', mass: 286, category: 'metal', period: 7, group: 13, approxMass: true },
  { number: 114, symbol: 'Fl', name: 'Flerovium', mass: 289, category: 'metal', period: 7, group: 14, approxMass: true },
  { number: 115, symbol: 'Mc', name: 'Moscovium', mass: 290, category: 'metal', period: 7, group: 15, approxMass: true },
  { number: 116, symbol: 'Lv', name: 'Livermorium', mass: 293, category: 'metal', period: 7, group: 16, approxMass: true },
  { number: 117, symbol: 'Ts', name: 'Tennessine', mass: 294, category: 'nonmetal', period: 7, group: 17, approxMass: true },
  { number: 118, symbol: 'Og', name: 'Oganesson', mass: 294, category: 'nonmetal', period: 7, group: 18, approxMass: true },

  { number: 58, symbol: 'Ce', name: 'Cerium', mass: 140.116, category: 'metal', period: 6, group: 4, footnoteRow: 'lanthanide', footnoteIndex: 1 },
  { number: 59, symbol: 'Pr', name: 'Praseodymium', mass: 140.908, category: 'metal', period: 6, group: 5, footnoteRow: 'lanthanide', footnoteIndex: 2 },
  { number: 60, symbol: 'Nd', name: 'Neodymium', mass: 144.242, category: 'metal', period: 6, group: 6, footnoteRow: 'lanthanide', footnoteIndex: 3 },
  { number: 61, symbol: 'Pm', name: 'Promethium', mass: 145, category: 'metal', period: 6, group: 7, footnoteRow: 'lanthanide', footnoteIndex: 4, approxMass: true },
  { number: 62, symbol: 'Sm', name: 'Samarium', mass: 150.36, category: 'metal', period: 6, group: 8, footnoteRow: 'lanthanide', footnoteIndex: 5 },
  { number: 63, symbol: 'Eu', name: 'Europium', mass: 151.964, category: 'metal', period: 6, group: 9, footnoteRow: 'lanthanide', footnoteIndex: 6 },
  { number: 64, symbol: 'Gd', name: 'Gadolinium', mass: 157.25, category: 'metal', period: 6, group: 10, footnoteRow: 'lanthanide', footnoteIndex: 7 },
  { number: 65, symbol: 'Tb', name: 'Terbium', mass: 158.925, category: 'metal', period: 6, group: 11, footnoteRow: 'lanthanide', footnoteIndex: 8 },
  { number: 66, symbol: 'Dy', name: 'Dysprosium', mass: 162.500, category: 'metal', period: 6, group: 12, footnoteRow: 'lanthanide', footnoteIndex: 9 },
  { number: 67, symbol: 'Ho', name: 'Holmium', mass: 164.930, category: 'metal', period: 6, group: 13, footnoteRow: 'lanthanide', footnoteIndex: 10 },
  { number: 68, symbol: 'Er', name: 'Erbium', mass: 167.259, category: 'metal', period: 6, group: 14, footnoteRow: 'lanthanide', footnoteIndex: 11 },
  { number: 69, symbol: 'Tm', name: 'Thulium', mass: 168.934, category: 'metal', period: 6, group: 15, footnoteRow: 'lanthanide', footnoteIndex: 12 },
  { number: 70, symbol: 'Yb', name: 'Ytterbium', mass: 173.045, category: 'metal', period: 6, group: 16, footnoteRow: 'lanthanide', footnoteIndex: 13 },
  { number: 71, symbol: 'Lu', name: 'Lutetium', mass: 174.967, category: 'metal', period: 6, group: 17, footnoteRow: 'lanthanide', footnoteIndex: 14 },

  { number: 90, symbol: 'Th', name: 'Thorium', mass: 232.038, category: 'metal', period: 7, group: 4, footnoteRow: 'actinide', footnoteIndex: 1 },
  { number: 91, symbol: 'Pa', name: 'Protactinium', mass: 231.036, category: 'metal', period: 7, group: 5, footnoteRow: 'actinide', footnoteIndex: 2 },
  { number: 92, symbol: 'U', name: 'Uranium', mass: 238.029, category: 'metal', period: 7, group: 6, footnoteRow: 'actinide', footnoteIndex: 3 },
  { number: 93, symbol: 'Np', name: 'Neptunium', mass: 237, category: 'metal', period: 7, group: 7, footnoteRow: 'actinide', footnoteIndex: 4, approxMass: true },
  { number: 94, symbol: 'Pu', name: 'Plutonium', mass: 244, category: 'metal', period: 7, group: 8, footnoteRow: 'actinide', footnoteIndex: 5, approxMass: true },
  { number: 95, symbol: 'Am', name: 'Americium', mass: 243, category: 'metal', period: 7, group: 9, footnoteRow: 'actinide', footnoteIndex: 6, approxMass: true },
  { number: 96, symbol: 'Cm', name: 'Curium', mass: 247, category: 'metal', period: 7, group: 10, footnoteRow: 'actinide', footnoteIndex: 7, approxMass: true },
  { number: 97, symbol: 'Bk', name: 'Berkelium', mass: 247, category: 'metal', period: 7, group: 11, footnoteRow: 'actinide', footnoteIndex: 8, approxMass: true },
  { number: 98, symbol: 'Cf', name: 'Californium', mass: 251, category: 'metal', period: 7, group: 12, footnoteRow: 'actinide', footnoteIndex: 9, approxMass: true },
  { number: 99, symbol: 'Es', name: 'Einsteinium', mass: 252, category: 'metal', period: 7, group: 13, footnoteRow: 'actinide', footnoteIndex: 10, approxMass: true },
  { number: 100, symbol: 'Fm', name: 'Fermium', mass: 257, category: 'metal', period: 7, group: 14, footnoteRow: 'actinide', footnoteIndex: 11, approxMass: true },
  { number: 101, symbol: 'Md', name: 'Mendelevium', mass: 258, category: 'metal', period: 7, group: 15, footnoteRow: 'actinide', footnoteIndex: 12, approxMass: true },
  { number: 102, symbol: 'No', name: 'Nobelium', mass: 259, category: 'metal', period: 7, group: 16, footnoteRow: 'actinide', footnoteIndex: 13, approxMass: true },
  { number: 103, symbol: 'Lr', name: 'Lawrencium', mass: 266, category: 'metal', period: 7, group: 17, footnoteRow: 'actinide', footnoteIndex: 14, approxMass: true },
]

export function searchElements(query: string): PeriodicElement[] {
  const q = query.trim().toLowerCase()
  if (!q) return PERIODIC_TABLE
  return PERIODIC_TABLE.filter(
    (el) =>
      el.name.toLowerCase().includes(q) ||
      el.symbol.toLowerCase().includes(q) ||
      String(el.number) === q
  )
}
