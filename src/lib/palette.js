/**
 * Category colours. Picked to stay distinguishable next to each other in the
 * charts and legible as small swatches in lists.
 */
export const CATEGORY_COLORS = [
  '#4f46e5', // indigo
  '#0891b2', // cyan
  '#059669', // emerald
  '#ca8a04', // amber
  '#dc2626', // red
  '#c026d3', // fuchsia
  '#2563eb', // blue
  '#65a30d', // lime
  '#ea580c', // orange
  '#0f766e', // teal
  '#7c3aed', // violet
  '#64748b', // slate
]

/** Next unused colour, so new categories do not all look the same. */
export function suggestColor(existingCategories) {
  const used = new Set(existingCategories.map((category) => category.color))
  return CATEGORY_COLORS.find((color) => !used.has(color)) || CATEGORY_COLORS[0]
}
