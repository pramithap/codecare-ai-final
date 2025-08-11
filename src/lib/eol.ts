import fs from 'fs/promises'
import path from 'path'

// Cache for public EOL feeds
let publicEolFeeds: Record<string, any[]> = {}
let internalEolMap: Record<string, Record<string, string>> = {}
let lastCacheTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Load EOL data with caching
export async function loadEolData(): Promise<void> {
  const now = Date.now()
  
  // Check if cache is still valid
  if (now - lastCacheTime < CACHE_DURATION && Object.keys(internalEolMap).length > 0) {
    return
  }

  try {
    // Load internal EOL data
    const eolFilePath = path.join(process.cwd(), 'data', 'eol.json')
    const eolFileContent = await fs.readFile(eolFilePath, 'utf-8')
    internalEolMap = JSON.parse(eolFileContent)

    // Fetch public EOL feeds
    const feedPromises = [
      fetchEolFeed('nodejs', 'https://endoflife.date/api/nodejs.json'),
      fetchEolFeed('java', 'https://endoflife.date/api/java.json'),
      fetchEolFeed('python', 'https://endoflife.date/api/python.json'),
      fetchEolFeed('dotnet', 'https://endoflife.date/api/dotnet.json'),
    ]

    await Promise.allSettled(feedPromises)
    lastCacheTime = now
    console.log('EOL data loaded and cached successfully')
  } catch (error) {
    console.warn('Failed to load EOL data:', error)
  }
}

// Fetch individual EOL feed
async function fetchEolFeed(ecosystem: string, url: string): Promise<void> {
  try {
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      publicEolFeeds[ecosystem] = data
      console.log(`Loaded EOL data for ${ecosystem}: ${data.length} entries`)
    }
  } catch (error) {
    console.warn(`Failed to fetch EOL data for ${ecosystem}:`, error)
  }
}

// Determine EOL date for a library
export function getEolDate(name: string, latestVersion: string, type: string): string | null {
  if (!latestVersion || latestVersion === 'unknown') return null

  try {
    // Extract major version
    const versionParts = latestVersion.split('.')
    const majorVersion = versionParts[0]

    // 1. Check public EOL feeds first
    let eolDate: string | null = null

    if (type === 'npm') {
      const feed = publicEolFeeds['nodejs']
      if (feed) {
        const entry = feed.find(e => e.cycle === majorVersion)
        if (entry && typeof entry.eol === 'string') {
          eolDate = entry.eol
        }
      }
    }

    if (!eolDate && (type === 'maven' || type === 'gradle')) {
      const feed = publicEolFeeds['java']
      if (feed) {
        const entry = feed.find(e => e.cycle === majorVersion)
        if (entry && typeof entry.eol === 'string') {
          eolDate = entry.eol
        }
      }
    }

    // 2. Fallback to internal EOL map
    if (!eolDate) {
      // Try exact name match first
      let nameMap = internalEolMap[name]
      
      // If no exact match, try partial matches for common patterns
      if (!nameMap) {
        const nameKeys = Object.keys(internalEolMap)
        const partialMatch = nameKeys.find(key => 
          name.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(name.toLowerCase())
        )
        if (partialMatch) {
          nameMap = internalEolMap[partialMatch]
        }
      }

      if (nameMap) {
        // Try major version first, then major.minor
        eolDate = nameMap[majorVersion] || 
                  nameMap[`${majorVersion}.${versionParts[1] || '0'}`] ||
                  null
      }
    }

    return eolDate
  } catch (error) {
    console.warn(`Error determining EOL date for ${name}:`, error)
    return null
  }
}

// Utility functions for date comparisons
export function isEolReached(eolDate: string): boolean {
  if (!eolDate) return false
  const today = new Date()
  const eol = new Date(eolDate)
  return eol < today
}

export function isEolWithin90Days(eolDate: string): boolean {
  if (!eolDate) return false
  const today = new Date()
  const eol = new Date(eolDate)
  const daysUntilEol = Math.ceil((eol.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilEol <= 90 && daysUntilEol >= 0
}

export function formatEolDate(eolDate: string): string {
  if (!eolDate) return ''
  try {
    return new Date(eolDate).toLocaleDateString()
  } catch {
    return eolDate
  }
}
