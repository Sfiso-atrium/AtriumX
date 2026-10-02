// src/data/formulas.ts
//
// Static reference data for the Toolkit's formula sheet - first-year
// university level, plus the high-school formulas that first-year courses
// still lean on (e.g. the quadratic formula, SUVAT equations). Organised
// as Subject -> Topic -> Formula, matching how a printed course formula
// sheet is usually laid out.
//
// `name` is the formula's common title - for the ones that are genuinely
// named laws (Ohm's Law, Newton's Second Law, Hess's Law...), the law's
// name IS the title, so it's never buried or left unstated. Formulas that
// aren't named laws just get a plain descriptive title instead.
//
// `expression` is written in plain text (², √, Δ, π, etc.) rather than
// LaTeX, since this renders anywhere with no extra rendering library.

export type Subject = 'maths' | 'physics' | 'chemistry'

export interface FormulaVariable {
  symbol: string
  meaning: string
  unit?: string
}

export interface Formula {
  id: string
  subject: Subject
  topic: string
  name: string
  expression: string
  variables: FormulaVariable[]
  notes?: string
}

export const SUBJECT_LABEL: Record<Subject, string> = {
  maths: 'Maths',
  physics: 'Physics',
  chemistry: 'Chemistry',
}

export const ALL_SUBJECTS: Subject[] = ['maths', 'physics', 'chemistry']

export const FORMULAS: Formula[] = [
  // ───────────────────────── MATHS ─────────────────────────
  {
    id: 'm-quadratic-formula',
    subject: 'maths', topic: 'Algebra & Equations', name: 'Quadratic Formula',
    expression: 'x = (-b ± √(b² - 4ac)) / 2a',
    variables: [
      { symbol: 'x', meaning: 'the root(s) that solve ax² + bx + c = 0' },
      { symbol: 'a', meaning: 'coefficient of x²' },
      { symbol: 'b', meaning: 'coefficient of x' },
      { symbol: 'c', meaning: 'constant term' },
    ],
  },
  {
    id: 'm-discriminant',
    subject: 'maths', topic: 'Algebra & Equations', name: 'Discriminant',
    expression: 'Δ = b² - 4ac',
    variables: [
      { symbol: 'Δ', meaning: 'discriminant - tells you how many real roots ax² + bx + c = 0 has' },
      { symbol: 'a', meaning: 'coefficient of x²' },
      { symbol: 'b', meaning: 'coefficient of x' },
      { symbol: 'c', meaning: 'constant term' },
    ],
    notes: 'Δ > 0: two real roots. Δ = 0: one repeated real root. Δ < 0: no real roots.',
  },
  {
    id: 'm-exponent-laws',
    subject: 'maths', topic: 'Algebra & Equations', name: 'Laws of Exponents',
    expression: 'aᵐ·aⁿ = aᵐ⁺ⁿ,  aᵐ/aⁿ = aᵐ⁻ⁿ,  (aᵐ)ⁿ = aᵐⁿ,  a⁻ⁿ = 1/aⁿ',
    variables: [
      { symbol: 'a', meaning: 'the base (any nonzero real number)' },
      { symbol: 'm, n', meaning: 'exponents' },
    ],
  },
  {
    id: 'm-log-laws',
    subject: 'maths', topic: 'Algebra & Equations', name: 'Laws of Logarithms',
    expression: 'logₐ(xy) = logₐx + logₐy,  logₐ(x/y) = logₐx - logₐy,  logₐ(xⁿ) = n·logₐx',
    variables: [
      { symbol: 'a', meaning: 'base of the logarithm' },
      { symbol: 'x, y', meaning: 'positive real numbers' },
      { symbol: 'n', meaning: 'any real exponent' },
    ],
  },
  {
    id: 'm-change-of-base',
    subject: 'maths', topic: 'Algebra & Equations', name: 'Change of Base Formula',
    expression: 'logₐx = ln(x) / ln(a)',
    variables: [
      { symbol: 'a', meaning: 'the original base' },
      { symbol: 'x', meaning: 'the value being logged' },
    ],
  },
  {
    id: 'm-binomial-theorem',
    subject: 'maths', topic: 'Algebra & Equations', name: 'Binomial Theorem',
    expression: '(x + y)ⁿ = Σₖ₌₀ⁿ (n choose k) xⁿ⁻ᵏyᵏ',
    variables: [
      { symbol: 'n', meaning: 'a positive integer power' },
      { symbol: 'k', meaning: 'the term index, running from 0 to n' },
      { symbol: '(n choose k)', meaning: 'n! / (k!(n-k)!), the binomial coefficient' },
    ],
  },

  {
    id: 'm-gradient',
    subject: 'maths', topic: 'Coordinate Geometry', name: 'Gradient (Slope) of a Line',
    expression: 'm = (y₂ - y₁) / (x₂ - x₁)',
    variables: [
      { symbol: 'm', meaning: 'gradient of the line through the two points' },
      { symbol: '(x₁, y₁), (x₂, y₂)', meaning: 'two points on the line' },
    ],
  },
  {
    id: 'm-distance-formula',
    subject: 'maths', topic: 'Coordinate Geometry', name: 'Distance Between Two Points',
    expression: 'd = √((x₂ - x₁)² + (y₂ - y₁)²)',
    variables: [
      { symbol: 'd', meaning: 'straight-line distance between the two points' },
      { symbol: '(x₁, y₁), (x₂, y₂)', meaning: 'the two points' },
    ],
  },
  {
    id: 'm-midpoint-formula',
    subject: 'maths', topic: 'Coordinate Geometry', name: 'Midpoint Formula',
    expression: 'M = ((x₁ + x₂)/2, (y₁ + y₂)/2)',
    variables: [
      { symbol: 'M', meaning: 'midpoint of the segment joining the two points' },
      { symbol: '(x₁, y₁), (x₂, y₂)', meaning: 'the two endpoints' },
    ],
  },
  {
    id: 'm-equation-of-line',
    subject: 'maths', topic: 'Coordinate Geometry', name: 'Equation of a Straight Line',
    expression: 'y = mx + c',
    variables: [
      { symbol: 'm', meaning: 'gradient of the line' },
      { symbol: 'c', meaning: 'y-intercept — where the line crosses the y-axis' },
    ],
  },

  {
    id: 'm-sine-rule',
    subject: 'maths', topic: 'Trigonometry', name: 'Sine Rule',
    expression: 'a/sin(A) = b/sin(B) = c/sin(C)',
    variables: [
      { symbol: 'a, b, c', meaning: 'side lengths of a triangle' },
      { symbol: 'A, B, C', meaning: 'angles opposite sides a, b, c respectively' },
    ],
  },
  {
    id: 'm-cosine-rule',
    subject: 'maths', topic: 'Trigonometry', name: 'Cosine Rule',
    expression: 'c² = a² + b² - 2ab·cos(C)',
    variables: [
      { symbol: 'a, b, c', meaning: 'side lengths of a triangle' },
      { symbol: 'C', meaning: 'angle opposite side c' },
    ],
  },
  {
    id: 'm-pythagorean-identity',
    subject: 'maths', topic: 'Trigonometry', name: 'Pythagorean Identity',
    expression: 'sin²θ + cos²θ = 1',
    variables: [
      { symbol: 'θ', meaning: 'any angle' },
    ],
  },
  {
    id: 'm-compound-angle',
    subject: 'maths', topic: 'Trigonometry', name: 'Compound Angle Formulas',
    expression: 'sin(A ± B) = sinA·cosB ± cosA·sinB,  cos(A ± B) = cosA·cosB ∓ sinA·sinB',
    variables: [
      { symbol: 'A, B', meaning: 'any two angles' },
    ],
  },
  {
    id: 'm-double-angle',
    subject: 'maths', topic: 'Trigonometry', name: 'Double Angle Formulas',
    expression: 'sin(2θ) = 2sinθ·cosθ,  cos(2θ) = cos²θ - sin²θ',
    variables: [
      { symbol: 'θ', meaning: 'any angle' },
    ],
  },
  {
    id: 'm-area-triangle-trig',
    subject: 'maths', topic: 'Trigonometry', name: 'Area of a Triangle (trig form)',
    expression: 'Area = ½ab·sin(C)',
    variables: [
      { symbol: 'a, b', meaning: 'two side lengths' },
      { symbol: 'C', meaning: 'the included angle between sides a and b' },
    ],
  },

  {
    id: 'm-first-principles',
    subject: 'maths', topic: 'Differentiation', name: 'First Principles (Limit Definition)',
    expression: "f′(x) = lim(h→0) [f(x+h) - f(x)] / h",
    variables: [
      { symbol: "f′(x)", meaning: 'the derivative of f at x' },
      { symbol: 'h', meaning: 'a small change in x, shrinking towards zero' },
    ],
    notes: 'The definition every other differentiation rule is derived from — worth knowing even once the shortcut rules below take over.',
  },
  {
    id: 'm-derivative-power-rule',
    subject: 'maths', topic: 'Differentiation', name: 'Power Rule',
    expression: 'd/dx(xⁿ) = n·xⁿ⁻¹',
    variables: [
      { symbol: 'x', meaning: 'the variable' },
      { symbol: 'n', meaning: 'any real constant power' },
    ],
  },
  {
    id: 'm-product-rule',
    subject: 'maths', topic: 'Differentiation', name: 'Product Rule',
    expression: 'd/dx(uv) = u′v + uv′',
    variables: [
      { symbol: 'u, v', meaning: 'two functions of x' },
      { symbol: "u′, v′", meaning: 'their derivatives' },
    ],
  },
  {
    id: 'm-quotient-rule',
    subject: 'maths', topic: 'Differentiation', name: 'Quotient Rule',
    expression: "d/dx(u/v) = (u′v - uv′) / v²",
    variables: [
      { symbol: 'u, v', meaning: 'two functions of x (v ≠ 0)' },
      { symbol: "u′, v′", meaning: 'their derivatives' },
    ],
  },
  {
    id: 'm-chain-rule',
    subject: 'maths', topic: 'Differentiation', name: 'Chain Rule',
    expression: 'dy/dx = (dy/du)·(du/dx)',
    variables: [
      { symbol: 'y', meaning: 'a function of u, where u is itself a function of x' },
    ],
  },
  {
    id: 'm-derivative-trig-exp-log',
    subject: 'maths', topic: 'Differentiation', name: 'Derivatives of sin, eˣ, ln(x)',
    expression: 'd/dx(sinx) = cosx,  d/dx(cosx) = -sinx,  d/dx(eˣ) = eˣ,  d/dx(lnx) = 1/x',
    variables: [
      { symbol: 'x', meaning: 'the variable' },
    ],
  },

  {
    id: 'm-integral-power-rule',
    subject: 'maths', topic: 'Integration', name: 'Power Rule (integral form)',
    expression: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C   (n ≠ -1)',
    variables: [
      { symbol: 'n', meaning: 'any real constant power other than -1' },
      { symbol: 'C', meaning: 'the constant of integration' },
    ],
  },
  {
    id: 'm-integration-by-parts',
    subject: 'maths', topic: 'Integration', name: 'Integration by Parts',
    expression: '∫u dv = uv - ∫v du',
    variables: [
      { symbol: 'u, v', meaning: 'functions chosen so the right-hand integral is simpler' },
    ],
  },
  {
    id: 'm-definite-integral-area',
    subject: 'maths', topic: 'Integration', name: 'Definite Integral (area under a curve)',
    expression: '∫ₐᵇ f(x) dx = F(b) - F(a)',
    variables: [
      { symbol: 'f(x)', meaning: 'the function being integrated' },
      { symbol: 'F(x)', meaning: 'any antiderivative of f(x)' },
      { symbol: 'a, b', meaning: 'lower and upper limits' },
    ],
  },
  {
    id: 'm-common-integrals',
    subject: 'maths', topic: 'Integration', name: 'Common Integrals',
    expression: '∫1/x dx = ln|x| + C,  ∫eˣ dx = eˣ + C,  ∫sinx dx = -cosx + C',
    variables: [
      { symbol: 'C', meaning: 'the constant of integration' },
    ],
  },

  {
    id: 'm-arithmetic-sequence',
    subject: 'maths', topic: 'Sequences & Series', name: 'Arithmetic Sequence (nth term)',
    expression: 'Tₙ = a + (n-1)d',
    variables: [
      { symbol: 'Tₙ', meaning: 'the nth term' },
      { symbol: 'a', meaning: 'the first term' },
      { symbol: 'd', meaning: 'the common difference' },
      { symbol: 'n', meaning: 'the term number' },
    ],
  },
  {
    id: 'm-arithmetic-series',
    subject: 'maths', topic: 'Sequences & Series', name: 'Arithmetic Series (sum)',
    expression: 'Sₙ = n/2 · (2a + (n-1)d)',
    variables: [
      { symbol: 'Sₙ', meaning: 'sum of the first n terms' },
      { symbol: 'a', meaning: 'the first term' },
      { symbol: 'd', meaning: 'the common difference' },
      { symbol: 'n', meaning: 'number of terms' },
    ],
  },
  {
    id: 'm-geometric-sequence',
    subject: 'maths', topic: 'Sequences & Series', name: 'Geometric Sequence (nth term)',
    expression: 'Tₙ = a·rⁿ⁻¹',
    variables: [
      { symbol: 'Tₙ', meaning: 'the nth term' },
      { symbol: 'a', meaning: 'the first term' },
      { symbol: 'r', meaning: 'the common ratio' },
      { symbol: 'n', meaning: 'the term number' },
    ],
  },
  {
    id: 'm-geometric-series',
    subject: 'maths', topic: 'Sequences & Series', name: 'Geometric Series (sum)',
    expression: 'Sₙ = a(1 - rⁿ) / (1 - r)   (r ≠ 1)',
    variables: [
      { symbol: 'Sₙ', meaning: 'sum of the first n terms' },
      { symbol: 'a', meaning: 'the first term' },
      { symbol: 'r', meaning: 'the common ratio' },
    ],
  },
  {
    id: 'm-geometric-series-infinite',
    subject: 'maths', topic: 'Sequences & Series', name: 'Sum to Infinity',
    expression: 'S∞ = a / (1 - r)   (|r| < 1)',
    variables: [
      { symbol: 'S∞', meaning: 'the sum as n → ∞' },
      { symbol: 'a', meaning: 'the first term' },
      { symbol: 'r', meaning: 'the common ratio, with |r| < 1 for the sum to converge' },
    ],
  },

  {
    id: 'm-vector-magnitude',
    subject: 'maths', topic: 'Vectors', name: 'Magnitude of a Vector',
    expression: '|v| = √(x² + y² + z²)',
    variables: [
      { symbol: 'v', meaning: 'a vector with components (x, y, z)' },
      { symbol: '|v|', meaning: "the vector's length" },
    ],
  },
  {
    id: 'm-dot-product',
    subject: 'maths', topic: 'Vectors', name: 'Dot Product',
    expression: 'a·b = |a||b|cosθ = a₁b₁ + a₂b₂ + a₃b₃',
    variables: [
      { symbol: 'a, b', meaning: 'two vectors' },
      { symbol: 'θ', meaning: 'the angle between them' },
    ],
  },
  {
    id: 'm-cross-product-magnitude',
    subject: 'maths', topic: 'Vectors', name: 'Cross Product (magnitude)',
    expression: '|a × b| = |a||b|sinθ',
    variables: [
      { symbol: 'a, b', meaning: 'two vectors' },
      { symbol: 'θ', meaning: 'the angle between them' },
    ],
    notes: 'The result is a vector perpendicular to both a and b; this gives only its magnitude.',
  },
  {
    id: 'm-unit-vector',
    subject: 'maths', topic: 'Vectors', name: 'Unit Vector',
    expression: 'â = a / |a|',
    variables: [
      { symbol: 'â', meaning: 'the unit vector in the direction of a' },
      { symbol: 'a', meaning: 'any nonzero vector' },
    ],
  },

  {
    id: 'm-complex-modulus',
    subject: 'maths', topic: 'Complex Numbers', name: 'Modulus of a Complex Number',
    expression: '|z| = √(a² + b²)',
    variables: [
      { symbol: 'z', meaning: 'a complex number, z = a + bi' },
      { symbol: 'a', meaning: 'the real part' },
      { symbol: 'b', meaning: 'the imaginary part' },
    ],
  },
  {
    id: 'm-complex-argument',
    subject: 'maths', topic: 'Complex Numbers', name: 'Argument of a Complex Number',
    expression: 'arg(z) = arctan(b/a)',
    variables: [
      { symbol: 'z', meaning: 'a complex number, z = a + bi' },
      { symbol: 'a', meaning: 'the real part' },
      { symbol: 'b', meaning: 'the imaginary part' },
    ],
    notes: 'Adjust by ±180° depending on which quadrant (a, b) falls in.',
  },
  {
    id: 'm-de-moivre',
    subject: 'maths', topic: 'Complex Numbers', name: "De Moivre's Theorem",
    expression: '(cosθ + i·sinθ)ⁿ = cos(nθ) + i·sin(nθ)',
    variables: [
      { symbol: 'θ', meaning: 'the argument of the complex number' },
      { symbol: 'n', meaning: 'any real power' },
    ],
  },
  {
    id: 'm-euler-formula',
    subject: 'maths', topic: 'Complex Numbers', name: "Euler's Formula",
    expression: 'eⁱᶿ = cosθ + i·sinθ',
    variables: [
      { symbol: 'θ', meaning: 'any real angle (radians)' },
      { symbol: 'i', meaning: 'the imaginary unit, √-1' },
    ],
  },

  {
    id: 'm-mean',
    subject: 'maths', topic: 'Statistics & Probability', name: 'Mean',
    expression: 'x̄ = (Σxᵢ) / n',
    variables: [
      { symbol: 'x̄', meaning: 'the sample mean' },
      { symbol: 'xᵢ', meaning: 'each data value' },
      { symbol: 'n', meaning: 'number of data values' },
    ],
  },
  {
    id: 'm-variance-std-dev',
    subject: 'maths', topic: 'Statistics & Probability', name: 'Variance & Standard Deviation',
    expression: 's² = Σ(xᵢ - x̄)² / (n - 1),  s = √(s²)',
    variables: [
      { symbol: 's²', meaning: 'sample variance' },
      { symbol: 's', meaning: 'sample standard deviation' },
      { symbol: 'xᵢ', meaning: 'each data value' },
      { symbol: 'x̄', meaning: 'the sample mean' },
      { symbol: 'n', meaning: 'number of data values' },
    ],
  },
  {
    id: 'm-z-score',
    subject: 'maths', topic: 'Statistics & Probability', name: 'Z-Score',
    expression: 'z = (x - μ) / σ',
    variables: [
      { symbol: 'z', meaning: 'number of standard deviations from the mean' },
      { symbol: 'x', meaning: 'a single data value' },
      { symbol: 'μ', meaning: 'the population mean' },
      { symbol: 'σ', meaning: 'the population standard deviation' },
    ],
  },
  {
    id: 'm-permutations',
    subject: 'maths', topic: 'Statistics & Probability', name: 'Permutations',
    expression: 'ⁿPᵣ = n! / (n - r)!',
    variables: [
      { symbol: 'n', meaning: 'total number of items' },
      { symbol: 'r', meaning: 'number of items chosen, order matters' },
    ],
  },
  {
    id: 'm-combinations',
    subject: 'maths', topic: 'Statistics & Probability', name: 'Combinations',
    expression: 'ⁿCᵣ = n! / (r!(n - r)!)',
    variables: [
      { symbol: 'n', meaning: 'total number of items' },
      { symbol: 'r', meaning: 'number of items chosen, order does not matter' },
    ],
  },
  {
    id: 'm-probability-addition',
    subject: 'maths', topic: 'Statistics & Probability', name: 'Addition Rule of Probability',
    expression: 'P(A ∪ B) = P(A) + P(B) - P(A ∩ B)',
    variables: [
      { symbol: 'P(A ∪ B)', meaning: 'probability that A or B (or both) occurs' },
      { symbol: 'P(A ∩ B)', meaning: 'probability that both A and B occur' },
    ],
  },

  // ───────────────────────── PHYSICS ─────────────────────────
  {
    id: 'p-suvat-v-u-at',
    subject: 'physics', topic: 'Kinematics', name: 'Equations of Motion (SUVAT) - v = u + at',
    expression: 'v = u + at',
    variables: [
      { symbol: 'v', meaning: 'final velocity', unit: 'm/s' },
      { symbol: 'u', meaning: 'initial velocity', unit: 'm/s' },
      { symbol: 'a', meaning: 'acceleration', unit: 'm/s²' },
      { symbol: 't', meaning: 'time', unit: 's' },
    ],
    notes: 'Assumes constant acceleration.',
  },
  {
    id: 'p-suvat-s',
    subject: 'physics', topic: 'Kinematics', name: 'Equations of Motion (SUVAT) - s = ut + ½at²',
    expression: 's = ut + ½at²',
    variables: [
      { symbol: 's', meaning: 'displacement', unit: 'm' },
      { symbol: 'u', meaning: 'initial velocity', unit: 'm/s' },
      { symbol: 'a', meaning: 'acceleration', unit: 'm/s²' },
      { symbol: 't', meaning: 'time', unit: 's' },
    ],
  },
  {
    id: 'p-suvat-v2',
    subject: 'physics', topic: 'Kinematics', name: 'Equations of Motion (SUVAT) - v² = u² + 2as',
    expression: 'v² = u² + 2as',
    variables: [
      { symbol: 'v', meaning: 'final velocity', unit: 'm/s' },
      { symbol: 'u', meaning: 'initial velocity', unit: 'm/s' },
      { symbol: 'a', meaning: 'acceleration', unit: 'm/s²' },
      { symbol: 's', meaning: 'displacement', unit: 'm' },
    ],
  },
  {
    id: 'p-average-velocity',
    subject: 'physics', topic: 'Kinematics', name: 'Average Velocity',
    expression: 'v̄ = Δx / Δt',
    variables: [
      { symbol: 'v̄', meaning: 'average velocity', unit: 'm/s' },
      { symbol: 'Δx', meaning: 'displacement', unit: 'm' },
      { symbol: 'Δt', meaning: 'time interval', unit: 's' },
    ],
  },

  {
    id: 'p-newtons-second-law',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: "Newton's Second Law of Motion",
    expression: 'F = ma',
    variables: [
      { symbol: 'F', meaning: 'net force', unit: 'N' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'a', meaning: 'acceleration', unit: 'm/s²' },
    ],
  },
  {
    id: 'p-weight',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: 'Weight',
    expression: 'W = mg',
    variables: [
      { symbol: 'W', meaning: 'weight (gravitational force)', unit: 'N' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'g', meaning: 'gravitational acceleration (≈ 9.81 m/s² on Earth)', unit: 'm/s²' },
    ],
  },
  {
    id: 'p-friction',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: 'Friction Force',
    expression: 'f = μN',
    variables: [
      { symbol: 'f', meaning: 'friction force', unit: 'N' },
      { symbol: 'μ', meaning: 'coefficient of friction (static or kinetic)' },
      { symbol: 'N', meaning: 'normal force', unit: 'N' },
    ],
  },
  {
    id: 'p-momentum',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: 'Momentum',
    expression: 'p = mv',
    variables: [
      { symbol: 'p', meaning: 'momentum', unit: 'kg·m/s' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'v', meaning: 'velocity', unit: 'm/s' },
    ],
  },
  {
    id: 'p-impulse',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: 'Impulse-Momentum Theorem',
    expression: 'J = FΔt = Δp',
    variables: [
      { symbol: 'J', meaning: 'impulse', unit: 'N·s' },
      { symbol: 'F', meaning: 'force applied', unit: 'N' },
      { symbol: 'Δt', meaning: 'time interval force acts over', unit: 's' },
      { symbol: 'Δp', meaning: 'change in momentum', unit: 'kg·m/s' },
    ],
  },
  {
    id: 'p-conservation-of-momentum',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: 'Conservation of Momentum',
    expression: 'm₁u₁ + m₂u₂ = m₁v₁ + m₂v₂',
    variables: [
      { symbol: 'm₁, m₂', meaning: 'masses of the two objects', unit: 'kg' },
      { symbol: 'u₁, u₂', meaning: 'velocities before the collision/interaction', unit: 'm/s' },
      { symbol: 'v₁, v₂', meaning: 'velocities after the collision/interaction', unit: 'm/s' },
    ],
    notes: 'Holds for any closed system with no external net force — true whether the collision is elastic or not.',
  },

  {
    id: 'p-density',
    subject: 'physics', topic: 'Density & Pressure', name: 'Density',
    expression: 'ρ = m / V',
    variables: [
      { symbol: 'ρ', meaning: 'density', unit: 'kg/m³' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'V', meaning: 'volume', unit: 'm³' },
    ],
  },
  {
    id: 'p-pressure',
    subject: 'physics', topic: 'Density & Pressure', name: 'Pressure',
    expression: 'P = F / A',
    variables: [
      { symbol: 'P', meaning: 'pressure', unit: 'Pa (N/m²)' },
      { symbol: 'F', meaning: 'force applied perpendicular to the surface', unit: 'N' },
      { symbol: 'A', meaning: 'area the force acts over', unit: 'm²' },
    ],
  },
  {
    id: 'p-hydrostatic-pressure',
    subject: 'physics', topic: 'Density & Pressure', name: 'Hydrostatic Pressure',
    expression: 'P = ρgh',
    variables: [
      { symbol: 'P', meaning: 'pressure at depth h in the fluid', unit: 'Pa' },
      { symbol: 'ρ', meaning: 'fluid density', unit: 'kg/m³' },
      { symbol: 'g', meaning: 'gravitational acceleration', unit: 'm/s²' },
      { symbol: 'h', meaning: 'depth below the fluid surface', unit: 'm' },
    ],
  },

  {
    id: 'p-work-done',
    subject: 'physics', topic: 'Work, Energy & Power', name: 'Work Done',
    expression: 'W = Fd·cosθ',
    variables: [
      { symbol: 'W', meaning: 'work done', unit: 'J' },
      { symbol: 'F', meaning: 'applied force', unit: 'N' },
      { symbol: 'd', meaning: 'displacement', unit: 'm' },
      { symbol: 'θ', meaning: 'angle between force and displacement' },
    ],
  },
  {
    id: 'p-kinetic-energy',
    subject: 'physics', topic: 'Work, Energy & Power', name: 'Kinetic Energy',
    expression: 'KE = ½mv²',
    variables: [
      { symbol: 'KE', meaning: 'kinetic energy', unit: 'J' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'v', meaning: 'speed', unit: 'm/s' },
    ],
  },
  {
    id: 'p-gpe',
    subject: 'physics', topic: 'Work, Energy & Power', name: 'Gravitational Potential Energy',
    expression: 'GPE = mgh',
    variables: [
      { symbol: 'GPE', meaning: 'gravitational potential energy', unit: 'J' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'g', meaning: 'gravitational acceleration', unit: 'm/s²' },
      { symbol: 'h', meaning: 'height above reference point', unit: 'm' },
    ],
  },
  {
    id: 'p-power',
    subject: 'physics', topic: 'Work, Energy & Power', name: 'Power',
    expression: 'P = W/t = Fv',
    variables: [
      { symbol: 'P', meaning: 'power', unit: 'W' },
      { symbol: 'W', meaning: 'work done', unit: 'J' },
      { symbol: 't', meaning: 'time', unit: 's' },
      { symbol: 'F', meaning: 'force', unit: 'N' },
      { symbol: 'v', meaning: 'velocity', unit: 'm/s' },
    ],
  },
  {
    id: 'p-conservation-of-energy',
    subject: 'physics', topic: 'Work, Energy & Power', name: 'Conservation of Mechanical Energy',
    expression: 'KEᵢ + PEᵢ = KEf + PEf',
    variables: [
      { symbol: 'KEᵢ, PEᵢ', meaning: 'initial kinetic and potential energy', unit: 'J' },
      { symbol: 'KEf, PEf', meaning: 'final kinetic and potential energy', unit: 'J' },
    ],
    notes: 'Holds only when no non-conservative forces (like friction) do work on the system.',
  },

  {
    id: 'p-centripetal-force',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: 'Centripetal Force',
    expression: 'Fc = mv²/r',
    variables: [
      { symbol: 'Fc', meaning: 'centripetal force', unit: 'N' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'v', meaning: 'speed', unit: 'm/s' },
      { symbol: 'r', meaning: 'radius of the circular path', unit: 'm' },
    ],
  },
  {
    id: 'p-centripetal-acceleration',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: 'Centripetal Acceleration',
    expression: 'ac = v²/r',
    variables: [
      { symbol: 'ac', meaning: 'centripetal acceleration', unit: 'm/s²' },
      { symbol: 'v', meaning: 'speed', unit: 'm/s' },
      { symbol: 'r', meaning: 'radius of the circular path', unit: 'm' },
    ],
  },
  {
    id: 'p-newtons-law-of-gravitation',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: 'Newton\u2019s Law of Universal Gravitation',
    expression: 'F = Gm₁m₂/r²',
    variables: [
      { symbol: 'F', meaning: 'gravitational force between the two masses', unit: 'N' },
      { symbol: 'G', meaning: 'gravitational constant (6.674 × 10⁻¹¹ N·m²/kg²)' },
      { symbol: 'm₁, m₂', meaning: 'the two masses', unit: 'kg' },
      { symbol: 'r', meaning: 'distance between their centres', unit: 'm' },
    ],
  },
  {
    id: 'p-orbital-period',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: "Kepler's Third Law",
    expression: 'T² ∝ r³   (T²/r³ = 4π²/GM)',
    variables: [
      { symbol: 'T', meaning: 'orbital period', unit: 's' },
      { symbol: 'r', meaning: 'orbital radius', unit: 'm' },
      { symbol: 'M', meaning: 'mass of the central body', unit: 'kg' },
    ],
  },

  {
    id: 'p-ohms-law',
    subject: 'physics', topic: 'Electricity & Circuits', name: "Ohm's Law",
    expression: 'V = IR',
    variables: [
      { symbol: 'V', meaning: 'voltage', unit: 'V' },
      { symbol: 'I', meaning: 'current', unit: 'A' },
      { symbol: 'R', meaning: 'resistance', unit: 'Ω' },
    ],
  },
  {
    id: 'p-electrical-power',
    subject: 'physics', topic: 'Electricity & Circuits', name: 'Electrical Power',
    expression: 'P = VI = I²R = V²/R',
    variables: [
      { symbol: 'P', meaning: 'power dissipated', unit: 'W' },
      { symbol: 'V', meaning: 'voltage', unit: 'V' },
      { symbol: 'I', meaning: 'current', unit: 'A' },
      { symbol: 'R', meaning: 'resistance', unit: 'Ω' },
    ],
  },
  {
    id: 'p-resistors-series',
    subject: 'physics', topic: 'Electricity & Circuits', name: 'Resistors in Series',
    expression: 'Rₜ = R₁ + R₂ + R₃ + ...',
    variables: [
      { symbol: 'Rₜ', meaning: 'total resistance', unit: 'Ω' },
      { symbol: 'R₁, R₂, ...', meaning: 'individual resistances', unit: 'Ω' },
    ],
  },
  {
    id: 'p-resistors-parallel',
    subject: 'physics', topic: 'Electricity & Circuits', name: 'Resistors in Parallel',
    expression: '1/Rₜ = 1/R₁ + 1/R₂ + 1/R₃ + ...',
    variables: [
      { symbol: 'Rₜ', meaning: 'total resistance', unit: 'Ω' },
      { symbol: 'R₁, R₂, ...', meaning: 'individual resistances', unit: 'Ω' },
    ],
  },
  {
    id: 'p-coulombs-law',
    subject: 'physics', topic: 'Electricity & Circuits', name: "Coulomb's Law",
    expression: 'F = kq₁q₂/r²',
    variables: [
      { symbol: 'F', meaning: 'electrostatic force between the charges', unit: 'N' },
      { symbol: 'k', meaning: "Coulomb's constant (8.99 × 10⁹ N·m²/C²)" },
      { symbol: 'q₁, q₂', meaning: 'the two point charges', unit: 'C' },
      { symbol: 'r', meaning: 'distance between the charges', unit: 'm' },
    ],
  },

  {
    id: 'p-wave-equation',
    subject: 'physics', topic: 'Waves & Sound', name: 'Wave Equation',
    expression: 'v = fλ',
    variables: [
      { symbol: 'v', meaning: 'wave speed', unit: 'm/s' },
      { symbol: 'f', meaning: 'frequency', unit: 'Hz' },
      { symbol: 'λ', meaning: 'wavelength', unit: 'm' },
    ],
  },
  {
    id: 'p-period-frequency',
    subject: 'physics', topic: 'Waves & Sound', name: 'Period-Frequency Relation',
    expression: 'T = 1/f',
    variables: [
      { symbol: 'T', meaning: 'period', unit: 's' },
      { symbol: 'f', meaning: 'frequency', unit: 'Hz' },
    ],
  },
  {
    id: 'p-doppler-effect',
    subject: 'physics', topic: 'Waves & Sound', name: 'Doppler Effect',
    expression: "f′ = f·(v ± v₀)/(v ∓ vₛ)",
    variables: [
      { symbol: "f′", meaning: 'observed frequency', unit: 'Hz' },
      { symbol: 'f', meaning: 'source (emitted) frequency', unit: 'Hz' },
      { symbol: 'v', meaning: 'speed of sound in the medium', unit: 'm/s' },
      { symbol: 'v₀', meaning: 'observer speed (+ toward source)', unit: 'm/s' },
      { symbol: 'vₛ', meaning: 'source speed (- moving toward observer)', unit: 'm/s' },
    ],
  },
  {
    id: 'p-sound-intensity',
    subject: 'physics', topic: 'Waves & Sound', name: 'Sound Intensity',
    expression: 'I = P/A',
    variables: [
      { symbol: 'I', meaning: 'intensity', unit: 'W/m²' },
      { symbol: 'P', meaning: 'power of the sound source', unit: 'W' },
      { symbol: 'A', meaning: 'area the power is spread over', unit: 'm²' },
    ],
  },

  {
    id: 'p-specific-heat',
    subject: 'physics', topic: 'Thermodynamics & Heat', name: 'Specific Heat Capacity',
    expression: 'Q = mcΔT',
    variables: [
      { symbol: 'Q', meaning: 'heat energy transferred', unit: 'J' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'c', meaning: 'specific heat capacity', unit: 'J/(kg·K)' },
      { symbol: 'ΔT', meaning: 'change in temperature', unit: 'K or °C' },
    ],
  },
  {
    id: 'p-ideal-gas-law',
    subject: 'physics', topic: 'Thermodynamics & Heat', name: 'Ideal Gas Law',
    expression: 'PV = nRT',
    variables: [
      { symbol: 'P', meaning: 'pressure', unit: 'Pa' },
      { symbol: 'V', meaning: 'volume', unit: 'm³' },
      { symbol: 'n', meaning: 'amount of substance', unit: 'mol' },
      { symbol: 'R', meaning: 'universal gas constant (8.314 J/(mol·K))' },
      { symbol: 'T', meaning: 'absolute temperature', unit: 'K' },
    ],
  },
  {
    id: 'p-first-law-thermo',
    subject: 'physics', topic: 'Thermodynamics & Heat', name: 'First Law of Thermodynamics',
    expression: 'ΔU = Q - W',
    variables: [
      { symbol: 'ΔU', meaning: "change in the system's internal energy", unit: 'J' },
      { symbol: 'Q', meaning: 'heat added to the system', unit: 'J' },
      { symbol: 'W', meaning: 'work done by the system', unit: 'J' },
    ],
  },

  {
    id: 'p-photon-energy',
    subject: 'physics', topic: 'Modern & Quantum Physics', name: 'Photon Energy',
    expression: 'E = hf',
    variables: [
      { symbol: 'E', meaning: 'photon energy', unit: 'J' },
      { symbol: 'h', meaning: "Planck's constant (6.626 × 10⁻³⁴ J·s)" },
      { symbol: 'f', meaning: 'frequency of the light', unit: 'Hz' },
    ],
  },
  {
    id: 'p-mass-energy-equivalence',
    subject: 'physics', topic: 'Modern & Quantum Physics', name: "Mass-Energy Equivalence",
    expression: 'E = mc²',
    variables: [
      { symbol: 'E', meaning: 'energy', unit: 'J' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'c', meaning: 'speed of light (3 × 10⁸ m/s)' },
    ],
  },
  {
    id: 'p-de-broglie-wavelength',
    subject: 'physics', topic: 'Modern & Quantum Physics', name: 'De Broglie Wavelength',
    expression: 'λ = h/p',
    variables: [
      { symbol: 'λ', meaning: 'wavelength associated with a moving particle', unit: 'm' },
      { symbol: 'h', meaning: "Planck's constant" },
      { symbol: 'p', meaning: 'momentum of the particle', unit: 'kg·m/s' },
    ],
  },

  // ─────────────── ADDITIONAL PHYSICS REFERENCE ───────────────
  // Expanded from the chapter-summary quantitative tools in Mazur's
  // Principles & Practice of Physics. These additions keep the existing
  // Toolkit data model and UI unchanged; they only broaden the reference.
  {
    id: 'p-average-acceleration',
    subject: 'physics', topic: 'Kinematics', name: 'Average Acceleration',
    expression: 'ā = Δv / Δt',
    variables: [
      { symbol: 'ā', meaning: 'average acceleration', unit: 'm/s²' },
      { symbol: 'Δv', meaning: 'change in velocity', unit: 'm/s' },
      { symbol: 'Δt', meaning: 'time interval', unit: 's' },
    ],
  },
  {
    id: 'p-suvat-average-velocity',
    subject: 'physics', topic: 'Kinematics', name: 'Constant-Acceleration Displacement',
    expression: 's = ½(u + v)t',
    variables: [
      { symbol: 's', meaning: 'displacement', unit: 'm' },
      { symbol: 'u', meaning: 'initial velocity', unit: 'm/s' },
      { symbol: 'v', meaning: 'final velocity', unit: 'm/s' },
      { symbol: 't', meaning: 'time interval', unit: 's' },
    ],
    notes: 'Valid for constant acceleration.',
  },
  {
    id: 'p-vector-magnitude',
    subject: 'physics', topic: 'Vectors & Motion in a Plane', name: 'Vector Magnitude from Components',
    expression: '|A⃗| = √(Aₓ² + Aᵧ²)',
    variables: [
      { symbol: '|A⃗|', meaning: 'magnitude of the vector' },
      { symbol: 'Aₓ, Aᵧ', meaning: 'x and y components of the vector' },
    ],
  },
  {
    id: 'p-vector-components',
    subject: 'physics', topic: 'Vectors & Motion in a Plane', name: 'Vector Components',
    expression: 'Aₓ = A cosθ,  Aᵧ = A sinθ',
    variables: [
      { symbol: 'A', meaning: 'magnitude of the vector' },
      { symbol: 'Aₓ, Aᵧ', meaning: 'x and y components' },
      { symbol: 'θ', meaning: 'angle measured from the positive x-axis' },
    ],
  },
  {
    id: 'p-dot-product',
    subject: 'physics', topic: 'Vectors & Motion in a Plane', name: 'Scalar (Dot) Product',
    expression: 'A⃗·B⃗ = AB cosθ',
    variables: [
      { symbol: 'A, B', meaning: 'magnitudes of the two vectors' },
      { symbol: 'θ', meaning: 'angle between the vectors' },
    ],
  },
  {
    id: 'p-projectile-motion',
    subject: 'physics', topic: 'Vectors & Motion in a Plane', name: 'Projectile Motion Components',
    expression: 'x = x₀ + v₀ₓt,  y = y₀ + v₀ᵧt - ½gt²,  vᵧ = v₀ᵧ - gt',
    variables: [
      { symbol: 'x, y', meaning: 'position coordinates', unit: 'm' },
      { symbol: 'x₀, y₀', meaning: 'initial position coordinates', unit: 'm' },
      { symbol: 'v₀ₓ, v₀ᵧ', meaning: 'initial velocity components', unit: 'm/s' },
      { symbol: 'g', meaning: 'gravitational acceleration near Earth', unit: 'm/s²' },
      { symbol: 't', meaning: 'elapsed time', unit: 's' },
    ],
    notes: 'Assumes air resistance is negligible and +y is upward.',
  },

  {
    id: 'p-force-momentum-rate',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: 'Force as Rate of Change of Momentum',
    expression: 'ΣF⃗ = dp⃗/dt',
    variables: [
      { symbol: 'ΣF⃗', meaning: 'net external force', unit: 'N' },
      { symbol: 'p⃗', meaning: 'momentum', unit: 'kg·m/s' },
      { symbol: 't', meaning: 'time', unit: 's' },
    ],
  },
  {
    id: 'p-hookes-law',
    subject: 'physics', topic: "Newton's Laws & Dynamics", name: "Hooke's Law",
    expression: 'Fₛ = -kx',
    variables: [
      { symbol: 'Fₛ', meaning: 'spring restoring force', unit: 'N' },
      { symbol: 'k', meaning: 'spring constant', unit: 'N/m' },
      { symbol: 'x', meaning: 'displacement from equilibrium', unit: 'm' },
    ],
    notes: 'The minus sign shows that the spring force points back toward equilibrium.',
  },

  {
    id: 'p-angular-displacement',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Angular Displacement',
    expression: 'θ = s/r',
    variables: [
      { symbol: 'θ', meaning: 'angular displacement', unit: 'rad' },
      { symbol: 's', meaning: 'arc length', unit: 'm' },
      { symbol: 'r', meaning: 'radius', unit: 'm' },
    ],
  },
  {
    id: 'p-angular-velocity',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Angular Velocity',
    expression: 'ω = dθ/dt',
    variables: [
      { symbol: 'ω', meaning: 'angular velocity', unit: 'rad/s' },
      { symbol: 'θ', meaning: 'angular position', unit: 'rad' },
      { symbol: 't', meaning: 'time', unit: 's' },
    ],
  },
  {
    id: 'p-angular-acceleration',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Angular Acceleration',
    expression: 'α = dω/dt',
    variables: [
      { symbol: 'α', meaning: 'angular acceleration', unit: 'rad/s²' },
      { symbol: 'ω', meaning: 'angular velocity', unit: 'rad/s' },
    ],
  },
  {
    id: 'p-tangential-speed',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Tangential Speed',
    expression: 'v = rω',
    variables: [
      { symbol: 'v', meaning: 'tangential speed', unit: 'm/s' },
      { symbol: 'r', meaning: 'distance from the rotation axis', unit: 'm' },
      { symbol: 'ω', meaning: 'angular velocity', unit: 'rad/s' },
    ],
  },
  {
    id: 'p-tangential-acceleration',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Tangential Acceleration',
    expression: 'aₜ = rα',
    variables: [
      { symbol: 'aₜ', meaning: 'tangential acceleration', unit: 'm/s²' },
      { symbol: 'r', meaning: 'distance from the rotation axis', unit: 'm' },
      { symbol: 'α', meaning: 'angular acceleration', unit: 'rad/s²' },
    ],
  },
  {
    id: 'p-rotational-inertia-particle',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Rotational Inertia of a Point Mass',
    expression: 'I = mr²',
    variables: [
      { symbol: 'I', meaning: 'rotational inertia (moment of inertia)', unit: 'kg·m²' },
      { symbol: 'm', meaning: 'mass', unit: 'kg' },
      { symbol: 'r', meaning: 'distance from the rotation axis', unit: 'm' },
    ],
  },
  {
    id: 'p-torque',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Torque',
    expression: 'τ = rF sinθ',
    variables: [
      { symbol: 'τ', meaning: 'torque about the pivot', unit: 'N·m' },
      { symbol: 'r', meaning: 'distance from pivot to point of application', unit: 'm' },
      { symbol: 'F', meaning: 'force magnitude', unit: 'N' },
      { symbol: 'θ', meaning: 'angle between r⃗ and F⃗' },
    ],
  },
  {
    id: 'p-rotational-dynamics',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Rotational Equation of Motion',
    expression: 'Στ = Iα',
    variables: [
      { symbol: 'Στ', meaning: 'net external torque', unit: 'N·m' },
      { symbol: 'I', meaning: 'rotational inertia', unit: 'kg·m²' },
      { symbol: 'α', meaning: 'angular acceleration', unit: 'rad/s²' },
    ],
  },
  {
    id: 'p-rotational-kinetic-energy',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Rotational Kinetic Energy',
    expression: 'Kᵣₒₜ = ½Iω²',
    variables: [
      { symbol: 'Kᵣₒₜ', meaning: 'rotational kinetic energy', unit: 'J' },
      { symbol: 'I', meaning: 'rotational inertia', unit: 'kg·m²' },
      { symbol: 'ω', meaning: 'angular velocity', unit: 'rad/s' },
    ],
  },
  {
    id: 'p-angular-momentum-particle',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Angular Momentum of a Particle',
    expression: 'L⃗ = r⃗ × p⃗',
    variables: [
      { symbol: 'L⃗', meaning: 'angular momentum', unit: 'kg·m²/s' },
      { symbol: 'r⃗', meaning: 'position vector from the chosen origin', unit: 'm' },
      { symbol: 'p⃗', meaning: 'linear momentum', unit: 'kg·m/s' },
    ],
  },
  {
    id: 'p-angular-momentum-law',
    subject: 'physics', topic: 'Rotation & Torque', name: 'Angular Momentum Law',
    expression: 'Στ⃗ = dL⃗/dt',
    variables: [
      { symbol: 'Στ⃗', meaning: 'net external torque', unit: 'N·m' },
      { symbol: 'L⃗', meaning: 'angular momentum', unit: 'kg·m²/s' },
    ],
  },

  {
    id: 'p-gravitational-potential-energy',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: 'Gravitational Potential Energy (Universal)',
    expression: 'U = -Gm₁m₂/r',
    variables: [
      { symbol: 'U', meaning: 'gravitational potential energy', unit: 'J' },
      { symbol: 'G', meaning: 'gravitational constant (6.674 × 10⁻¹¹ N·m²/kg²)' },
      { symbol: 'm₁, m₂', meaning: 'interacting masses', unit: 'kg' },
      { symbol: 'r', meaning: 'distance between their centres', unit: 'm' },
    ],
    notes: 'Uses zero gravitational potential energy at infinite separation.',
  },
  {
    id: 'p-circular-orbit-speed',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: 'Circular Orbit Speed',
    expression: 'v = √(GM/r)',
    variables: [
      { symbol: 'v', meaning: 'orbital speed for a circular orbit', unit: 'm/s' },
      { symbol: 'G', meaning: 'gravitational constant' },
      { symbol: 'M', meaning: 'mass of the central body', unit: 'kg' },
      { symbol: 'r', meaning: 'orbital radius from the central body', unit: 'm' },
    ],
  },
  {
    id: 'p-escape-speed',
    subject: 'physics', topic: 'Circular Motion & Gravitation', name: 'Escape Speed',
    expression: 'vₑ = √(2GM/r)',
    variables: [
      { symbol: 'vₑ', meaning: 'minimum escape speed from radius r', unit: 'm/s' },
      { symbol: 'G', meaning: 'gravitational constant' },
      { symbol: 'M', meaning: 'mass of the body being escaped from', unit: 'kg' },
      { symbol: 'r', meaning: 'distance from its centre', unit: 'm' },
    ],
  },

  {
    id: 'p-angular-frequency',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Angular Frequency',
    expression: 'ω = 2πf = 2π/T',
    variables: [
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
      { symbol: 'f', meaning: 'frequency', unit: 'Hz' },
      { symbol: 'T', meaning: 'period', unit: 's' },
    ],
  },
  {
    id: 'p-shm-position',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Simple Harmonic Motion Position',
    expression: 'x(t) = A sin(ωt + φ₀)',
    variables: [
      { symbol: 'x(t)', meaning: 'displacement from equilibrium', unit: 'm' },
      { symbol: 'A', meaning: 'amplitude', unit: 'm' },
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
      { symbol: 'φ₀', meaning: 'initial phase', unit: 'rad' },
    ],
  },
  {
    id: 'p-shm-velocity',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Simple Harmonic Motion Velocity',
    expression: 'v(t) = ωA cos(ωt + φ₀)',
    variables: [
      { symbol: 'v(t)', meaning: 'instantaneous velocity', unit: 'm/s' },
      { symbol: 'A', meaning: 'amplitude', unit: 'm' },
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
    ],
  },
  {
    id: 'p-shm-acceleration',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Simple Harmonic Motion Acceleration',
    expression: 'a = -ω²x',
    variables: [
      { symbol: 'a', meaning: 'instantaneous acceleration', unit: 'm/s²' },
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
      { symbol: 'x', meaning: 'displacement from equilibrium', unit: 'm' },
    ],
  },
  {
    id: 'p-shm-energy',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Energy of Simple Harmonic Motion',
    expression: 'E = ½mω²A²',
    variables: [
      { symbol: 'E', meaning: 'total mechanical energy', unit: 'J' },
      { symbol: 'm', meaning: 'oscillating mass', unit: 'kg' },
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
      { symbol: 'A', meaning: 'amplitude', unit: 'm' },
    ],
  },
  {
    id: 'p-spring-period',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Mass-Spring Oscillation Period',
    expression: 'T = 2π√(m/k)',
    variables: [
      { symbol: 'T', meaning: 'oscillation period', unit: 's' },
      { symbol: 'm', meaning: 'oscillating mass', unit: 'kg' },
      { symbol: 'k', meaning: 'spring constant', unit: 'N/m' },
    ],
  },
  {
    id: 'p-simple-pendulum-period',
    subject: 'physics', topic: 'Periodic Motion & SHM', name: 'Simple Pendulum Period',
    expression: 'T = 2π√(L/g)',
    variables: [
      { symbol: 'T', meaning: 'oscillation period', unit: 's' },
      { symbol: 'L', meaning: 'pendulum length', unit: 'm' },
      { symbol: 'g', meaning: 'gravitational acceleration', unit: 'm/s²' },
    ],
    notes: 'Small-angle approximation.',
  },

  {
    id: 'p-wave-number',
    subject: 'physics', topic: 'Waves & Sound', name: 'Wave Number',
    expression: 'k = 2π/λ',
    variables: [
      { symbol: 'k', meaning: 'wave number', unit: 'rad/m' },
      { symbol: 'λ', meaning: 'wavelength', unit: 'm' },
    ],
  },
  {
    id: 'p-harmonic-wave',
    subject: 'physics', topic: 'Waves & Sound', name: 'Travelling Harmonic Wave',
    expression: 'y(x,t) = A sin(kx - ωt + φ₀)',
    variables: [
      { symbol: 'y(x,t)', meaning: 'displacement of the medium', unit: 'm' },
      { symbol: 'A', meaning: 'wave amplitude', unit: 'm' },
      { symbol: 'k', meaning: 'wave number', unit: 'rad/m' },
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
      { symbol: 'φ₀', meaning: 'initial phase', unit: 'rad' },
    ],
    notes: 'The minus sign represents travel in the +x direction.',
  },
  {
    id: 'p-standing-wave',
    subject: 'physics', topic: 'Waves & Sound', name: 'Standing Wave (Equal Opposing Waves)',
    expression: 'y(x,t) = 2A sin(kx) cos(ωt)',
    variables: [
      { symbol: 'A', meaning: 'amplitude of each travelling wave', unit: 'm' },
      { symbol: 'k', meaning: 'wave number', unit: 'rad/m' },
      { symbol: 'ω', meaning: 'angular frequency', unit: 'rad/s' },
    ],
  },

  {
    id: 'p-buoyant-force',
    subject: 'physics', topic: 'Density & Pressure', name: "Archimedes' Principle (Buoyant Force)",
    expression: 'Fᵦ = ρfluid Vdisplaced g',
    variables: [
      { symbol: 'Fᵦ', meaning: 'buoyant force', unit: 'N' },
      { symbol: 'ρfluid', meaning: 'fluid density', unit: 'kg/m³' },
      { symbol: 'Vdisplaced', meaning: 'volume of displaced fluid', unit: 'm³' },
      { symbol: 'g', meaning: 'gravitational acceleration', unit: 'm/s²' },
    ],
  },
  {
    id: 'p-fluid-continuity',
    subject: 'physics', topic: 'Density & Pressure', name: 'Continuity Equation for Fluid Flow',
    expression: 'ρ₁A₁v₁ = ρ₂A₂v₂',
    variables: [
      { symbol: 'ρ', meaning: 'fluid density', unit: 'kg/m³' },
      { symbol: 'A', meaning: 'cross-sectional area', unit: 'm²' },
      { symbol: 'v', meaning: 'fluid speed', unit: 'm/s' },
    ],
    notes: 'For an incompressible fluid this becomes A₁v₁ = A₂v₂.',
  },
  {
    id: 'p-volume-flow-rate',
    subject: 'physics', topic: 'Density & Pressure', name: 'Volume Flow Rate',
    expression: 'Q = V/Δt = Av',
    variables: [
      { symbol: 'Q', meaning: 'volume flow rate', unit: 'm³/s' },
      { symbol: 'V', meaning: 'volume transported', unit: 'm³' },
      { symbol: 'Δt', meaning: 'time interval', unit: 's' },
      { symbol: 'A', meaning: 'cross-sectional area', unit: 'm²' },
      { symbol: 'v', meaning: 'fluid speed', unit: 'm/s' },
    ],
  },
  {
    id: 'p-bernoulli-equation',
    subject: 'physics', topic: 'Density & Pressure', name: "Bernoulli's Equation",
    expression: 'P + ½ρv² + ρgy = constant',
    variables: [
      { symbol: 'P', meaning: 'fluid pressure', unit: 'Pa' },
      { symbol: 'ρ', meaning: 'fluid density', unit: 'kg/m³' },
      { symbol: 'v', meaning: 'fluid speed', unit: 'm/s' },
      { symbol: 'y', meaning: 'height', unit: 'm' },
    ],
    notes: 'For steady, nonviscous, incompressible flow along a streamline.',
  },

  {
    id: 'p-charge-quantisation',
    subject: 'physics', topic: 'Electrostatics', name: 'Quantisation of Charge',
    expression: 'q = ne',
    variables: [
      { symbol: 'q', meaning: 'net electric charge', unit: 'C' },
      { symbol: 'n', meaning: 'integer number of elementary charges' },
      { symbol: 'e', meaning: 'elementary charge (1.602 × 10⁻¹⁹ C)', unit: 'C' },
    ],
  },
  {
    id: 'p-electric-field-definition',
    subject: 'physics', topic: 'Electrostatics', name: 'Electric Field Definition',
    expression: 'E⃗ = F⃗/q',
    variables: [
      { symbol: 'E⃗', meaning: 'electric field', unit: 'N/C' },
      { symbol: 'F⃗', meaning: 'electric force on a test charge', unit: 'N' },
      { symbol: 'q', meaning: 'test charge', unit: 'C' },
    ],
  },
  {
    id: 'p-point-charge-field',
    subject: 'physics', topic: 'Electrostatics', name: 'Electric Field of a Point Charge',
    expression: 'E = k|q|/r²',
    variables: [
      { symbol: 'E', meaning: 'electric-field magnitude', unit: 'N/C' },
      { symbol: 'k', meaning: "Coulomb's constant (8.99 × 10⁹ N·m²/C²)" },
      { symbol: 'q', meaning: 'source charge', unit: 'C' },
      { symbol: 'r', meaning: 'distance from the source charge', unit: 'm' },
    ],
  },
  {
    id: 'p-gauss-law',
    subject: 'physics', topic: 'Electrostatics', name: "Gauss's Law",
    expression: '∮E⃗·dA⃗ = qenc/ε₀',
    variables: [
      { symbol: 'E⃗', meaning: 'electric field', unit: 'N/C' },
      { symbol: 'dA⃗', meaning: 'outward area element', unit: 'm²' },
      { symbol: 'qenc', meaning: 'charge enclosed by the closed surface', unit: 'C' },
      { symbol: 'ε₀', meaning: 'vacuum permittivity (8.85 × 10⁻¹² C²/(N·m²))' },
    ],
  },
  {
    id: 'p-electric-potential-energy',
    subject: 'physics', topic: 'Electrostatics', name: 'Electric Potential Energy of Two Point Charges',
    expression: 'U = kq₁q₂/r',
    variables: [
      { symbol: 'U', meaning: 'electric potential energy', unit: 'J' },
      { symbol: 'k', meaning: "Coulomb's constant" },
      { symbol: 'q₁, q₂', meaning: 'point charges', unit: 'C' },
      { symbol: 'r', meaning: 'separation between charges', unit: 'm' },
    ],
  },
  {
    id: 'p-electric-potential-point-charge',
    subject: 'physics', topic: 'Electrostatics', name: 'Electric Potential of a Point Charge',
    expression: 'V = kq/r',
    variables: [
      { symbol: 'V', meaning: 'electric potential relative to infinity', unit: 'V' },
      { symbol: 'k', meaning: "Coulomb's constant" },
      { symbol: 'q', meaning: 'source charge', unit: 'C' },
      { symbol: 'r', meaning: 'distance from the charge', unit: 'm' },
    ],
  },
  {
    id: 'p-potential-difference-field',
    subject: 'physics', topic: 'Electrostatics', name: 'Potential Difference from Electric Field',
    expression: 'ΔV = -∫ E⃗·dℓ⃗',
    variables: [
      { symbol: 'ΔV', meaning: 'electric potential difference', unit: 'V' },
      { symbol: 'E⃗', meaning: 'electric field', unit: 'N/C' },
      { symbol: 'dℓ⃗', meaning: 'infinitesimal path displacement', unit: 'm' },
    ],
  },
  {
    id: 'p-capacitance',
    subject: 'physics', topic: 'Electrostatics', name: 'Capacitance',
    expression: 'C = q/V',
    variables: [
      { symbol: 'C', meaning: 'capacitance', unit: 'F' },
      { symbol: 'q', meaning: 'magnitude of charge on either conductor', unit: 'C' },
      { symbol: 'V', meaning: 'potential difference', unit: 'V' },
    ],
  },
  {
    id: 'p-parallel-plate-capacitance',
    subject: 'physics', topic: 'Electrostatics', name: 'Parallel-Plate Capacitance',
    expression: 'C = ε₀A/d',
    variables: [
      { symbol: 'C', meaning: 'capacitance', unit: 'F' },
      { symbol: 'ε₀', meaning: 'vacuum permittivity' },
      { symbol: 'A', meaning: 'area of one plate', unit: 'm²' },
      { symbol: 'd', meaning: 'plate separation', unit: 'm' },
    ],
  },
  {
    id: 'p-capacitor-energy',
    subject: 'physics', topic: 'Electrostatics', name: 'Energy Stored in a Capacitor',
    expression: 'U = ½CV² = ½qV = q²/(2C)',
    variables: [
      { symbol: 'U', meaning: 'stored electric potential energy', unit: 'J' },
      { symbol: 'C', meaning: 'capacitance', unit: 'F' },
      { symbol: 'V', meaning: 'potential difference', unit: 'V' },
      { symbol: 'q', meaning: 'stored charge magnitude', unit: 'C' },
    ],
  },

  {
    id: 'p-magnetic-force-charge',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Magnetic Force on a Moving Charge',
    expression: 'F = |q|vB sinθ',
    variables: [
      { symbol: 'F', meaning: 'magnetic-force magnitude', unit: 'N' },
      { symbol: 'q', meaning: 'particle charge', unit: 'C' },
      { symbol: 'v', meaning: 'particle speed', unit: 'm/s' },
      { symbol: 'B', meaning: 'magnetic-field magnitude', unit: 'T' },
      { symbol: 'θ', meaning: 'angle between v⃗ and B⃗' },
    ],
  },
  {
    id: 'p-lorentz-force',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Lorentz Force',
    expression: 'F⃗ = q(E⃗ + v⃗ × B⃗)',
    variables: [
      { symbol: 'F⃗', meaning: 'total electromagnetic force', unit: 'N' },
      { symbol: 'q', meaning: 'particle charge', unit: 'C' },
      { symbol: 'E⃗', meaning: 'electric field', unit: 'N/C' },
      { symbol: 'v⃗', meaning: 'particle velocity', unit: 'm/s' },
      { symbol: 'B⃗', meaning: 'magnetic field', unit: 'T' },
    ],
  },
  {
    id: 'p-magnetic-radius',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Radius of Charged Particle in a Magnetic Field',
    expression: 'r = mv/(|q|B)',
    variables: [
      { symbol: 'r', meaning: 'radius of the circular path', unit: 'm' },
      { symbol: 'm', meaning: 'particle mass', unit: 'kg' },
      { symbol: 'v', meaning: 'speed perpendicular to the field', unit: 'm/s' },
      { symbol: 'q', meaning: 'particle charge', unit: 'C' },
      { symbol: 'B', meaning: 'magnetic-field magnitude', unit: 'T' },
    ],
  },
  {
    id: 'p-magnetic-period',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Cyclotron Period',
    expression: 'T = 2πm/(|q|B)',
    variables: [
      { symbol: 'T', meaning: 'orbital period in a uniform magnetic field', unit: 's' },
      { symbol: 'm', meaning: 'particle mass', unit: 'kg' },
      { symbol: 'q', meaning: 'particle charge', unit: 'C' },
      { symbol: 'B', meaning: 'magnetic-field magnitude', unit: 'T' },
    ],
  },
  {
    id: 'p-magnetic-flux',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Magnetic Flux',
    expression: 'ΦB = ∫B⃗·dA⃗   (uniform: ΦB = BA cosθ)',
    variables: [
      { symbol: 'ΦB', meaning: 'magnetic flux', unit: 'Wb' },
      { symbol: 'B', meaning: 'magnetic-field magnitude', unit: 'T' },
      { symbol: 'A', meaning: 'surface area', unit: 'm²' },
      { symbol: 'θ', meaning: 'angle between B⃗ and the area normal' },
    ],
  },
  {
    id: 'p-ampere-law',
    subject: 'physics', topic: 'Magnetism & Induction', name: "Ampère's Law",
    expression: '∮B⃗·dℓ⃗ = μ₀Ienc',
    variables: [
      { symbol: 'B⃗', meaning: 'magnetic field', unit: 'T' },
      { symbol: 'Ienc', meaning: 'current enclosed by the path', unit: 'A' },
      { symbol: 'μ₀', meaning: 'vacuum permeability (4π × 10⁻⁷ T·m/A)' },
    ],
  },
  {
    id: 'p-field-straight-wire',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Magnetic Field of a Long Straight Wire',
    expression: 'B = μ₀I/(2πr)',
    variables: [
      { symbol: 'B', meaning: 'magnetic-field magnitude', unit: 'T' },
      { symbol: 'I', meaning: 'current in the wire', unit: 'A' },
      { symbol: 'r', meaning: 'perpendicular distance from the wire', unit: 'm' },
    ],
  },
  {
    id: 'p-field-solenoid',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Magnetic Field Inside an Ideal Solenoid',
    expression: 'B = μ₀nI',
    variables: [
      { symbol: 'B', meaning: 'magnetic-field magnitude inside the solenoid', unit: 'T' },
      { symbol: 'μ₀', meaning: 'vacuum permeability' },
      { symbol: 'n', meaning: 'number of turns per unit length', unit: 'm⁻¹' },
      { symbol: 'I', meaning: 'current', unit: 'A' },
    ],
  },
  {
    id: 'p-faraday-law',
    subject: 'physics', topic: 'Magnetism & Induction', name: "Faraday's Law of Induction",
    expression: 'ℰ = -dΦB/dt',
    variables: [
      { symbol: 'ℰ', meaning: 'induced emf', unit: 'V' },
      { symbol: 'ΦB', meaning: 'magnetic flux', unit: 'Wb' },
      { symbol: 't', meaning: 'time', unit: 's' },
    ],
    notes: "The minus sign is Lenz's law: the induced effect opposes the change in flux.",
  },
  {
    id: 'p-motional-emf',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Motional EMF',
    expression: '|ℰ| = Bℓv',
    variables: [
      { symbol: 'ℰ', meaning: 'induced emf', unit: 'V' },
      { symbol: 'B', meaning: 'magnetic-field magnitude', unit: 'T' },
      { symbol: 'ℓ', meaning: 'rod length perpendicular to the motion', unit: 'm' },
      { symbol: 'v', meaning: 'rod speed perpendicular to the field', unit: 'm/s' },
    ],
  },
  {
    id: 'p-inductor-emf',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Self-Induction EMF',
    expression: 'ℰ = -L(dI/dt)',
    variables: [
      { symbol: 'ℰ', meaning: 'induced emf', unit: 'V' },
      { symbol: 'L', meaning: 'inductance', unit: 'H' },
      { symbol: 'dI/dt', meaning: 'rate of change of current', unit: 'A/s' },
    ],
  },
  {
    id: 'p-inductor-energy',
    subject: 'physics', topic: 'Magnetism & Induction', name: 'Energy Stored in an Inductor',
    expression: 'UB = ½LI²',
    variables: [
      { symbol: 'UB', meaning: 'magnetic potential energy', unit: 'J' },
      { symbol: 'L', meaning: 'inductance', unit: 'H' },
      { symbol: 'I', meaning: 'current', unit: 'A' },
    ],
  },

  {
    id: 'p-electric-current',
    subject: 'physics', topic: 'Electricity & Circuits', name: 'Electric Current',
    expression: 'I = Δq/Δt',
    variables: [
      { symbol: 'I', meaning: 'electric current', unit: 'A' },
      { symbol: 'Δq', meaning: 'charge passing a point', unit: 'C' },
      { symbol: 'Δt', meaning: 'time interval', unit: 's' },
    ],
  },
  {
    id: 'p-resistance-geometry',
    subject: 'physics', topic: 'Electricity & Circuits', name: 'Resistance of a Uniform Conductor',
    expression: 'R = ρℓ/A = ℓ/(σA)',
    variables: [
      { symbol: 'R', meaning: 'resistance', unit: 'Ω' },
      { symbol: 'ρ', meaning: 'electrical resistivity', unit: 'Ω·m' },
      { symbol: 'σ', meaning: 'electrical conductivity', unit: 'S/m' },
      { symbol: 'ℓ', meaning: 'conductor length', unit: 'm' },
      { symbol: 'A', meaning: 'cross-sectional area', unit: 'm²' },
    ],
  },
  {
    id: 'p-kirchhoff-loop',
    subject: 'physics', topic: 'Electricity & Circuits', name: "Kirchhoff's Loop Rule",
    expression: 'Σℰ + ΣΔV = 0',
    variables: [
      { symbol: 'ℰ', meaning: 'emf sources around the loop', unit: 'V' },
      { symbol: 'ΔV', meaning: 'potential changes across circuit elements', unit: 'V' },
    ],
  },
  {
    id: 'p-kirchhoff-junction',
    subject: 'physics', topic: 'Electricity & Circuits', name: "Kirchhoff's Junction Rule",
    expression: 'ΣIin = ΣIout',
    variables: [
      { symbol: 'Iin', meaning: 'currents entering a junction', unit: 'A' },
      { symbol: 'Iout', meaning: 'currents leaving a junction', unit: 'A' },
    ],
  },

  {
    id: 'p-entropy-reversible',
    subject: 'physics', topic: 'Thermodynamics & Heat', name: 'Entropy Change (Reversible Transfer)',
    expression: 'ΔS = Qrev/T',
    variables: [
      { symbol: 'ΔS', meaning: 'entropy change', unit: 'J/K' },
      { symbol: 'Qrev', meaning: 'energy transferred thermally in a reversible process', unit: 'J' },
      { symbol: 'T', meaning: 'absolute temperature at which transfer occurs', unit: 'K' },
    ],
  },

  {
    id: 'p-index-refraction',
    subject: 'physics', topic: 'Optics', name: 'Index of Refraction',
    expression: 'n = c₀/v',
    variables: [
      { symbol: 'n', meaning: 'index of refraction' },
      { symbol: 'c₀', meaning: 'speed of light in vacuum', unit: 'm/s' },
      { symbol: 'v', meaning: 'speed of light in the medium', unit: 'm/s' },
    ],
  },
  {
    id: 'p-snells-law',
    subject: 'physics', topic: 'Optics', name: "Snell's Law",
    expression: 'n₁ sinθ₁ = n₂ sinθ₂',
    variables: [
      { symbol: 'n₁, n₂', meaning: 'indices of refraction of the two media' },
      { symbol: 'θ₁', meaning: 'angle of incidence measured from the normal' },
      { symbol: 'θ₂', meaning: 'angle of refraction measured from the normal' },
    ],
  },
  {
    id: 'p-critical-angle',
    subject: 'physics', topic: 'Optics', name: 'Critical Angle for Total Internal Reflection',
    expression: 'θc = sin⁻¹(n₂/n₁)   (n₁ > n₂)',
    variables: [
      { symbol: 'θc', meaning: 'critical angle' },
      { symbol: 'n₁', meaning: 'index of the higher-index medium' },
      { symbol: 'n₂', meaning: 'index of the lower-index medium' },
    ],
  },
  {
    id: 'p-thin-lens-equation',
    subject: 'physics', topic: 'Optics', name: 'Thin Lens Equation',
    expression: '1/f = 1/do + 1/di',
    variables: [
      { symbol: 'f', meaning: 'lens focal length', unit: 'm' },
      { symbol: 'do', meaning: 'object distance', unit: 'm' },
      { symbol: 'di', meaning: 'image distance', unit: 'm' },
    ],
  },
  {
    id: 'p-linear-magnification',
    subject: 'physics', topic: 'Optics', name: 'Linear Magnification',
    expression: 'M = hi/ho = -di/do',
    variables: [
      { symbol: 'M', meaning: 'linear magnification' },
      { symbol: 'hi, ho', meaning: 'image and object heights' },
      { symbol: 'di, do', meaning: 'image and object distances', unit: 'm' },
    ],
  },
  {
    id: 'p-double-slit-bright',
    subject: 'physics', topic: 'Optics', name: 'Double-Slit Bright Fringes',
    expression: 'd sinθ = mλ',
    variables: [
      { symbol: 'd', meaning: 'slit separation', unit: 'm' },
      { symbol: 'θ', meaning: 'fringe angle' },
      { symbol: 'm', meaning: 'fringe order (0, ±1, ±2, ...)' },
      { symbol: 'λ', meaning: 'wavelength', unit: 'm' },
    ],
  },
  {
    id: 'p-single-slit-minima',
    subject: 'physics', topic: 'Optics', name: 'Single-Slit Diffraction Minima',
    expression: 'a sinθ = mλ   (m = 1, 2, 3, ...)',
    variables: [
      { symbol: 'a', meaning: 'slit width', unit: 'm' },
      { symbol: 'θ', meaning: 'angle to a dark fringe' },
      { symbol: 'm', meaning: 'nonzero fringe order' },
      { symbol: 'λ', meaning: 'wavelength', unit: 'm' },
    ],
  },
  {
    id: 'p-rayleigh-criterion',
    subject: 'physics', topic: 'Optics', name: "Rayleigh's Criterion",
    expression: 'θmin ≈ 1.22λ/D',
    variables: [
      { symbol: 'θmin', meaning: 'minimum resolvable angular separation', unit: 'rad' },
      { symbol: 'λ', meaning: 'wavelength', unit: 'm' },
      { symbol: 'D', meaning: 'aperture diameter', unit: 'm' },
    ],
  },
  {
    id: 'p-photoelectric-equation',
    subject: 'physics', topic: 'Modern & Quantum Physics', name: 'Photoelectric Equation',
    expression: 'hf = Kmax + φ',
    variables: [
      { symbol: 'h', meaning: "Planck's constant" },
      { symbol: 'f', meaning: 'incident-light frequency', unit: 'Hz' },
      { symbol: 'Kmax', meaning: 'maximum kinetic energy of emitted electrons', unit: 'J' },
      { symbol: 'φ', meaning: 'work function of the material', unit: 'J' },
    ],
  },
  {
    id: 'p-photon-momentum',
    subject: 'physics', topic: 'Modern & Quantum Physics', name: 'Photon Momentum',
    expression: 'p = h/λ = hf/c₀',
    variables: [
      { symbol: 'p', meaning: 'photon momentum', unit: 'kg·m/s' },
      { symbol: 'h', meaning: "Planck's constant" },
      { symbol: 'λ', meaning: 'photon wavelength', unit: 'm' },
      { symbol: 'f', meaning: 'photon frequency', unit: 'Hz' },
      { symbol: 'c₀', meaning: 'speed of light in vacuum', unit: 'm/s' },
    ],
  },

  // ───────────────────────── CHEMISTRY ─────────────────────────
  {
    id: 'c-moles',
    subject: 'chemistry', topic: 'Stoichiometry & Moles', name: 'Moles from Mass',
    expression: 'n = m/M',
    variables: [
      { symbol: 'n', meaning: 'amount of substance', unit: 'mol' },
      { symbol: 'm', meaning: 'mass of the sample', unit: 'g' },
      { symbol: 'M', meaning: 'molar mass', unit: 'g/mol' },
    ],
  },
  {
    id: 'c-concentration',
    subject: 'chemistry', topic: 'Stoichiometry & Moles', name: 'Molar Concentration',
    expression: 'c = n/V',
    variables: [
      { symbol: 'c', meaning: 'concentration', unit: 'mol/L' },
      { symbol: 'n', meaning: 'amount of solute', unit: 'mol' },
      { symbol: 'V', meaning: 'volume of solution', unit: 'L' },
    ],
  },
  {
    id: 'c-dilution',
    subject: 'chemistry', topic: 'Stoichiometry & Moles', name: 'Dilution Equation',
    expression: 'c₁V₁ = c₂V₂',
    variables: [
      { symbol: 'c₁, V₁', meaning: 'concentration and volume before dilution' },
      { symbol: 'c₂, V₂', meaning: 'concentration and volume after dilution' },
    ],
  },
  {
    id: 'c-percent-yield',
    subject: 'chemistry', topic: 'Stoichiometry & Moles', name: 'Percentage Yield',
    expression: '% yield = (actual yield / theoretical yield) × 100',
    variables: [
      { symbol: 'actual yield', meaning: 'amount of product actually obtained' },
      { symbol: 'theoretical yield', meaning: 'maximum amount possible from the limiting reactant' },
    ],
  },
  {
    id: 'c-molarity-from-moles-mass',
    subject: 'chemistry', topic: 'Stoichiometry & Moles', name: 'Percentage Composition',
    expression: '% element = (mass of element in 1 mol compound / molar mass of compound) × 100',
    variables: [
      { symbol: 'mass of element', meaning: "the element's total mass contribution per mole of compound" },
      { symbol: 'molar mass of compound', meaning: 'total molar mass of the compound', unit: 'g/mol' },
    ],
  },

  {
    id: 'c-ideal-gas-law',
    subject: 'chemistry', topic: 'Gases', name: 'Ideal Gas Law',
    expression: 'PV = nRT',
    variables: [
      { symbol: 'P', meaning: 'pressure', unit: 'Pa or atm' },
      { symbol: 'V', meaning: 'volume', unit: 'L' },
      { symbol: 'n', meaning: 'amount of gas', unit: 'mol' },
      { symbol: 'R', meaning: 'gas constant (8.314 J/(mol·K), or 0.0821 L·atm/(mol·K))' },
      { symbol: 'T', meaning: 'absolute temperature', unit: 'K' },
    ],
  },
  {
    id: 'c-combined-gas-law',
    subject: 'chemistry', topic: 'Gases', name: 'Combined Gas Law',
    expression: 'P₁V₁/T₁ = P₂V₂/T₂',
    variables: [
      { symbol: 'P₁, V₁, T₁', meaning: 'initial pressure, volume, temperature' },
      { symbol: 'P₂, V₂, T₂', meaning: 'final pressure, volume, temperature' },
    ],
  },
  {
    id: 'c-daltons-law',
    subject: 'chemistry', topic: 'Gases', name: "Dalton's Law of Partial Pressures",
    expression: 'Pₜₒₜₐₗ = P₁ + P₂ + P₃ + ...',
    variables: [
      { symbol: 'Pₜₒₜₐₗ', meaning: 'total pressure of a gas mixture' },
      { symbol: 'P₁, P₂, ...', meaning: 'partial pressure of each individual gas' },
    ],
  },

  {
    id: 'c-heat-energy',
    subject: 'chemistry', topic: 'Thermochemistry', name: 'Heat Energy',
    expression: 'q = mcΔT',
    variables: [
      { symbol: 'q', meaning: 'heat absorbed or released', unit: 'J' },
      { symbol: 'm', meaning: 'mass', unit: 'g' },
      { symbol: 'c', meaning: 'specific heat capacity', unit: 'J/(g·°C)' },
      { symbol: 'ΔT', meaning: 'change in temperature', unit: '°C' },
    ],
  },
  {
    id: 'c-enthalpy-change',
    subject: 'chemistry', topic: 'Thermochemistry', name: 'Enthalpy Change of Reaction',
    expression: 'ΔH = H(products) - H(reactants)',
    variables: [
      { symbol: 'ΔH', meaning: 'enthalpy change', unit: 'kJ/mol' },
      { symbol: 'H', meaning: 'enthalpy (heat content) of products/reactants' },
    ],
  },
  {
    id: 'c-hess-law',
    subject: 'chemistry', topic: 'Thermochemistry', name: "Hess's Law",
    expression: 'ΔH°ᵣₓₙ = Σ ΔH°f(products) - Σ ΔH°f(reactants)',
    variables: [
      { symbol: 'ΔH°ᵣₓₙ', meaning: 'standard enthalpy of reaction', unit: 'kJ/mol' },
      { symbol: 'ΔH°f', meaning: 'standard enthalpy of formation of each species', unit: 'kJ/mol' },
    ],
    notes: "The total enthalpy change is the same regardless of the reaction pathway taken.",
  },

  {
    id: 'c-equilibrium-constant',
    subject: 'chemistry', topic: 'Equilibrium', name: 'Equilibrium Constant Expression',
    expression: 'Kc = [products]^coeff / [reactants]^coeff',
    variables: [
      { symbol: 'Kc', meaning: 'equilibrium constant in terms of concentration' },
      { symbol: '[X]', meaning: 'equilibrium molar concentration of species X, raised to its stoichiometric coefficient' },
    ],
  },
  {
    id: 'c-reaction-quotient',
    subject: 'chemistry', topic: 'Equilibrium', name: 'Reaction Quotient',
    expression: 'Q = [products]^coeff / [reactants]^coeff',
    variables: [
      { symbol: 'Q', meaning: 'reaction quotient, same form as Kc but at any point in the reaction (not necessarily equilibrium)' },
    ],
    notes: 'Q < Kc: reaction proceeds forward. Q > Kc: reaction proceeds in reverse. Q = Kc: at equilibrium.',
  },
  {
    id: 'c-kp-kc-relation',
    subject: 'chemistry', topic: 'Equilibrium', name: 'Kp-Kc Relationship',
    expression: 'Kp = Kc(RT)^Δn',
    variables: [
      { symbol: 'Kp', meaning: 'equilibrium constant in terms of partial pressures' },
      { symbol: 'Kc', meaning: 'equilibrium constant in terms of concentration' },
      { symbol: 'Δn', meaning: 'moles of gaseous product minus moles of gaseous reactant' },
    ],
  },

  {
    id: 'c-ph',
    subject: 'chemistry', topic: 'Acids & Bases', name: 'pH',
    expression: 'pH = -log[H⁺]',
    variables: [
      { symbol: 'pH', meaning: 'acidity measure' },
      { symbol: '[H⁺]', meaning: 'hydrogen ion concentration', unit: 'mol/L' },
    ],
  },
  {
    id: 'c-poh',
    subject: 'chemistry', topic: 'Acids & Bases', name: 'pOH',
    expression: 'pOH = -log[OH⁻],  pH + pOH = 14',
    variables: [
      { symbol: 'pOH', meaning: 'basicity measure' },
      { symbol: '[OH⁻]', meaning: 'hydroxide ion concentration', unit: 'mol/L' },
    ],
  },
  {
    id: 'c-ka-kb',
    subject: 'chemistry', topic: 'Acids & Bases', name: 'Acid/Base Dissociation Constants',
    expression: 'Ka = [H⁺][A⁻]/[HA],  Kw = Ka·Kb = 1.0 × 10⁻¹⁴',
    variables: [
      { symbol: 'Ka', meaning: 'acid dissociation constant' },
      { symbol: 'Kb', meaning: 'base dissociation constant of its conjugate base' },
      { symbol: 'Kw', meaning: 'ion product of water at 25°C' },
    ],
  },
  {
    id: 'c-henderson-hasselbalch',
    subject: 'chemistry', topic: 'Acids & Bases', name: 'Henderson-Hasselbalch Equation',
    expression: 'pH = pKa + log([A⁻]/[HA])',
    variables: [
      { symbol: 'pKa', meaning: '-log(Ka) of the weak acid' },
      { symbol: '[A⁻]', meaning: 'concentration of the conjugate base' },
      { symbol: '[HA]', meaning: 'concentration of the undissociated weak acid' },
    ],
    notes: 'Used to estimate buffer pH.',
  },

  {
    id: 'c-nernst-equation',
    subject: 'chemistry', topic: 'Electrochemistry', name: 'Nernst Equation',
    expression: 'E = E° - (RT/nF)·ln(Q)',
    variables: [
      { symbol: 'E', meaning: 'cell potential under non-standard conditions', unit: 'V' },
      { symbol: 'E°', meaning: 'standard cell potential', unit: 'V' },
      { symbol: 'n', meaning: 'number of electrons transferred' },
      { symbol: 'F', meaning: "Faraday's constant (96 485 C/mol)" },
      { symbol: 'Q', meaning: 'reaction quotient' },
    ],
  },
  {
    id: 'c-cell-potential',
    subject: 'chemistry', topic: 'Electrochemistry', name: 'Standard Cell Potential',
    expression: 'E°cell = E°cathode - E°anode',
    variables: [
      { symbol: 'E°cell', meaning: 'overall standard cell potential', unit: 'V' },
      { symbol: 'E°cathode', meaning: 'standard reduction potential at the cathode', unit: 'V' },
      { symbol: 'E°anode', meaning: 'standard reduction potential at the anode', unit: 'V' },
    ],
  },
  {
    id: 'c-faradays-law',
    subject: 'chemistry', topic: 'Electrochemistry', name: "Faraday's Law of Electrolysis",
    expression: 'n = It/F',
    variables: [
      { symbol: 'n', meaning: 'moles of electrons transferred', unit: 'mol' },
      { symbol: 'I', meaning: 'current', unit: 'A' },
      { symbol: 't', meaning: 'time', unit: 's' },
      { symbol: 'F', meaning: "Faraday's constant (96 485 C/mol)" },
    ],
  },

  {
    id: 'c-rate-law',
    subject: 'chemistry', topic: 'Kinetics', name: 'Rate Law',
    expression: 'Rate = k[A]ᵐ[B]ⁿ',
    variables: [
      { symbol: 'Rate', meaning: 'reaction rate', unit: 'mol/(L·s)' },
      { symbol: 'k', meaning: 'rate constant' },
      { symbol: '[A], [B]', meaning: 'reactant concentrations' },
      { symbol: 'm, n', meaning: 'reaction orders with respect to A and B (found experimentally)' },
    ],
  },
  {
    id: 'c-arrhenius-equation',
    subject: 'chemistry', topic: 'Kinetics', name: 'Arrhenius Equation',
    expression: 'k = Ae^(-Ea/RT)',
    variables: [
      { symbol: 'k', meaning: 'rate constant' },
      { symbol: 'A', meaning: 'pre-exponential (frequency) factor' },
      { symbol: 'Ea', meaning: 'activation energy', unit: 'J/mol' },
      { symbol: 'R', meaning: 'gas constant (8.314 J/(mol·K))' },
      { symbol: 'T', meaning: 'absolute temperature', unit: 'K' },
    ],
  },
  {
    id: 'c-half-life-first-order',
    subject: 'chemistry', topic: 'Kinetics', name: 'Half-Life (first-order reaction)',
    expression: 't½ = ln(2)/k',
    variables: [
      { symbol: 't½', meaning: 'half-life', unit: 's' },
      { symbol: 'k', meaning: 'first-order rate constant' },
    ],
  },

  {
    id: 'c-rydberg-equation',
    subject: 'chemistry', topic: 'Atomic Structure', name: 'Rydberg Equation',
    expression: '1/λ = R(1/n₁² - 1/n₂²)',
    variables: [
      { symbol: 'λ', meaning: 'wavelength of emitted/absorbed light', unit: 'm' },
      { symbol: 'R', meaning: "Rydberg constant (1.097 × 10⁷ m⁻¹)" },
      { symbol: 'n₁, n₂', meaning: 'initial and final electron energy levels' },
    ],
  },
  {
    id: 'c-bohr-energy-levels',
    subject: 'chemistry', topic: 'Atomic Structure', name: 'Bohr Model Energy Levels',
    expression: 'Eₙ = -2.18 × 10⁻¹⁸ J · (1/n²)',
    variables: [
      { symbol: 'Eₙ', meaning: "electron's energy at level n (hydrogen atom)", unit: 'J' },
      { symbol: 'n', meaning: 'principal quantum number (1, 2, 3, ...)' },
    ],
  },
  {
    id: 'c-de-broglie',
    subject: 'chemistry', topic: 'Atomic Structure', name: 'De Broglie Wavelength',
    expression: 'λ = h/p = h/(mv)',
    variables: [
      { symbol: 'λ', meaning: 'wavelength associated with a particle', unit: 'm' },
      { symbol: 'h', meaning: "Planck's constant" },
      { symbol: 'm, v', meaning: 'mass and velocity of the particle' },
    ],
  },
]

export function topicsFor(subject: Subject): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const f of FORMULAS) {
    if (f.subject === subject && !seen.has(f.topic)) {
      seen.add(f.topic)
      order.push(f.topic)
    }
  }
  return order
}

export function formulasFor(subject: Subject): Formula[] {
  return FORMULAS.filter(f => f.subject === subject)
}

// Searches by formula name, topic, or any variable's symbol/meaning -
// the brief specifically calls out variable name and topic, name search
// is just a natural addition on top of that.
export function searchFormulas(subject: Subject, query: string): Formula[] {
  const q = query.trim().toLowerCase()
  const inSubject = formulasFor(subject)
  if (!q) return inSubject
  return inSubject.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.topic.toLowerCase().includes(q) ||
    f.variables.some(v => v.symbol.toLowerCase().includes(q) || v.meaning.toLowerCase().includes(q))
  )
}
