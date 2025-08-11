// Client-side EOL utilities (no fs imports)

// EOL date formatting and comparison utilities
export function formatEolDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch {
    return dateStr
  }
}

export function getEolStatus(eolDate: string): 'expired' | 'warning' | 'ok' {
  const today = new Date()
  const eol = new Date(eolDate)
  const diffTime = eol.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'expired'
  if (diffDays <= 90) return 'warning'
  return 'ok'
}

export function getEolTooltip(eolDate: string): string {
  const status = getEolStatus(eolDate)
  const formatted = formatEolDate(eolDate)
  
  switch (status) {
    case 'expired':
      return `EOL reached on ${formatted}`
    case 'warning':
      return `EOL soon on ${formatted}`
    default:
      return `EOL date: ${formatted}`
  }
}

export function getEolTextColor(eolDate: string): string {
  const status = getEolStatus(eolDate)
  
  switch (status) {
    case 'expired':
      return 'text-red-600'
    case 'warning':
      return 'text-yellow-600'
    default:
      return 'text-gray-500'
  }
}
