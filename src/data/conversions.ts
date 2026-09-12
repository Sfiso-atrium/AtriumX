// src/data/conversions.ts
//
// Static conversion data for the Toolkit's unit converter. Length, mass,
// volume and time all convert through a shared base unit (metre, kilogram,
// litre, second) via a plain multiply/divide. Temperature can't work that
// way — Celsius/Fahrenheit/Kelvin differ by an offset, not just a scale
// factor — so it's handled separately at the bottom of this file.

export type ConversionCategory = 'length' | 'mass' | 'volume' | 'time' | 'temperature'

export interface ConversionUnit {
  id: string
  label: string
  toBase: number // multiply a value in this unit by this to get the base unit
}

interface ConversionCategoryDef {
  label: string
  units: ConversionUnit[]
}

export const CONVERSION_CATEGORIES: Record<Exclude<ConversionCategory, 'temperature'>, ConversionCategoryDef> = {
  length: {
    label: 'Length',
    units: [
      { id: 'mm', label: 'Millimeters', toBase: 0.001 },
      { id: 'cm', label: 'Centimeters', toBase: 0.01 },
      { id: 'm', label: 'Meters', toBase: 1 },
      { id: 'km', label: 'Kilometers', toBase: 1000 },
      { id: 'in', label: 'Inches', toBase: 0.0254 },
      { id: 'ft', label: 'Feet', toBase: 0.3048 },
      { id: 'yd', label: 'Yards', toBase: 0.9144 },
      { id: 'mi', label: 'Miles', toBase: 1609.344 },
    ],
  },
  mass: {
    label: 'Mass',
    units: [
      { id: 'mg', label: 'Milligrams', toBase: 0.000001 },
      { id: 'g', label: 'Grams', toBase: 0.001 },
      { id: 'kg', label: 'Kilograms', toBase: 1 },
      { id: 't', label: 'Tonnes', toBase: 1000 },
      { id: 'oz', label: 'Ounces', toBase: 0.0283495 },
      { id: 'lb', label: 'Pounds', toBase: 0.453592 },
    ],
  },
  volume: {
    label: 'Volume',
    units: [
      { id: 'ml', label: 'Milliliters', toBase: 0.001 },
      { id: 'l', label: 'Liters', toBase: 1 },
      { id: 'm3', label: 'Cubic meters', toBase: 1000 },
      { id: 'cup', label: 'Cups (US)', toBase: 0.236588 },
      { id: 'pt', label: 'Pints (US)', toBase: 0.473176 },
      { id: 'qt', label: 'Quarts (US)', toBase: 0.946353 },
      { id: 'gal', label: 'Gallons (US)', toBase: 3.78541 },
      { id: 'galuk', label: 'Gallons (UK)', toBase: 4.54609 },
    ],
  },
  time: {
    label: 'Time',
    units: [
      { id: 's', label: 'Seconds', toBase: 1 },
      { id: 'min', label: 'Minutes', toBase: 60 },
      { id: 'hr', label: 'Hours', toBase: 3600 },
      { id: 'day', label: 'Days', toBase: 86400 },
      { id: 'week', label: 'Weeks', toBase: 604800 },
    ],
  },
}

export const TEMPERATURE_UNITS: ConversionUnit[] = [
  { id: 'c', label: 'Celsius', toBase: 0 },
  { id: 'f', label: 'Fahrenheit', toBase: 0 },
  { id: 'k', label: 'Kelvin', toBase: 0 },
]

export const ALL_CATEGORIES: { id: ConversionCategory; label: string }[] = [
  { id: 'length', label: 'Length' },
  { id: 'mass', label: 'Mass' },
  { id: 'volume', label: 'Volume' },
  { id: 'time', label: 'Time' },
  { id: 'temperature', label: 'Temperature' },
]

function celsiusFrom(unit: string, value: number): number {
  if (unit === 'c') return value
  if (unit === 'f') return (value - 32) * (5 / 9)
  return value - 273.15 // kelvin
}

function celsiusTo(unit: string, celsius: number): number {
  if (unit === 'c') return celsius
  if (unit === 'f') return celsius * (9 / 5) + 32
  return celsius + 273.15 // kelvin
}

export function convert(category: ConversionCategory, fromId: string, toId: string, value: number): number {
  if (Number.isNaN(value)) return NaN
  if (category === 'temperature') {
    return celsiusTo(toId, celsiusFrom(fromId, value))
  }
  const def = CONVERSION_CATEGORIES[category]
  const fromUnit = def.units.find((u) => u.id === fromId)
  const toUnit = def.units.find((u) => u.id === toId)
  if (!fromUnit || !toUnit) return NaN
  return (value * fromUnit.toBase) / toUnit.toBase
}

export function unitsFor(category: ConversionCategory): ConversionUnit[] {
  return category === 'temperature' ? TEMPERATURE_UNITS : CONVERSION_CATEGORIES[category].units
}
