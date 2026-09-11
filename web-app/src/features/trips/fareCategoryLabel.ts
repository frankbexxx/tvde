/** Commercial fare category labels (A2.5). */

export function fareCategoryCommercialLabel(category: string | null | undefined): string {
  const raw = (category || 'x').trim().toLowerCase()
  switch (raw) {
    case 'x':
    case 'standard':
      return 'GO'
    case 'comfort':
      return 'Comfort'
    case 'xl':
      return 'XL'
    case 'pet':
      return 'GO' // legacy fare key
    default:
      return raw ? raw.toUpperCase() : 'GO'
  }
}
