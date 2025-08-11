import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs/promises'
import path from 'path'

interface LibraryInput {
  name: string
  currentVersion: string
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon'
}

interface EnrichedLibrary {
  name: string
  currentVersion: string
  latestVersion: string
  releaseDate: string
  eolDate?: string
  security?: {
    count: number
    severity: 'Low' | 'Med' | 'High' | 'Unknown'
  }
}

interface VersionsRequest {
  libs: LibraryInput[]
}

interface VersionsResponse {
  success: boolean
  enriched?: EnrichedLibrary[]
  error?: string
}

interface EolEntry {
  cycle: string
  eol: string | boolean
  latest?: string
  releaseDate?: string
}

// Cache for public EOL feeds and internal data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicEolFeeds: Record<string, any[]> = {}
let internalEolMap: Record<string, Record<string, string>> = {}
let eolDataLoaded = false
let lastFetchTime = 0
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Load EOL data from file and public feeds
async function loadEolData(): Promise<void> {
  const now = Date.now()
  if (eolDataLoaded && (now - lastFetchTime) < CACHE_DURATION) {
    return // Data is still fresh
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
    eolDataLoaded = true
    lastFetchTime = now
    console.log('EOL data loaded successfully')
  } catch (error) {
    console.warn('Failed to load EOL data:', error)
    eolDataLoaded = true // Set to true to prevent retries
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
function getEolDate(name: string, latestVersion: string, type: string): string | null {
  console.log(`getEolDate called: name=${name}, version=${latestVersion}, type=${type}`)
  if (!latestVersion || latestVersion === 'unknown') return null

  try {
    // Extract major version
    const versionParts = latestVersion.split('.')
    const majorVersion = versionParts[0]
    console.log(`Major version extracted: ${majorVersion}`)

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

// Helper function to fetch vulnerability information
async function fetchVulnerabilities(name: string, version: string, type: string): Promise<{ count: number; severity: 'Low' | 'Med' | 'High' | 'Unknown' }> {
  try {
    // Construct OSS Index package coordinate
    let coord: string | null = null;
    if (type === 'npm') coord = `pkg:npm/${name}@${version}`;
    else if (type === 'maven') coord = `pkg:maven/${name}@${version}`;
    else if (type === 'cpan') coord = `pkg:cpan/${name}@${version}`;
    if (!coord) return { count: 0, severity: 'Unknown' };

    const res = await fetch('https://ossindex.sonatype.org/api/v3/component-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.ossindex.component-report-request.v1+json' },
      body: JSON.stringify({ coordinates: [coord] }),
    });
    
    if (!res.ok) {
      console.warn(`Failed to fetch vulnerabilities for ${name}: ${res.status}`);
      return { count: 0, severity: 'Unknown' };
    }
    
    const reports = await res.json();
    const report = reports[0];
    
    if (!report) return { count: 0, severity: 'Unknown' };
    
    const count = report.vulnerabilities?.length || 0;
    const severity =
      count === 0 ? 'Low' :
      report.vulnerabilities.some((v: any) => v.cvssScore >= 7) ? 'High' :
      'Med';

    return { count, severity };
  } catch (error) {
    console.warn(`Error fetching vulnerabilities for ${name}:`, error);
    return { count: 0, severity: 'Unknown' };
  }
}

// Helper function to fetch npm package info
async function fetchNpmVersion(packageName: string): Promise<{ latestVersion: string; releaseDate: string }> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`)
    if (!response.ok) throw new Error('Package not found')
    
    const data = await response.json()
    const latestVersion = data['dist-tags']?.latest || 'unknown'
    const releaseDate = data.time?.[latestVersion] || 'unknown'
    
    return {
      latestVersion,
      releaseDate: releaseDate !== 'unknown' ? new Date(releaseDate).toISOString().split('T')[0] : 'unknown'
    }
  } catch (error) {
    console.warn(`Failed to fetch npm info for ${packageName}:`, error)
    return { latestVersion: 'unknown', releaseDate: 'unknown' }
  }
}

// Helper function to fetch Maven/Gradle package info
async function fetchMavenVersion(name: string): Promise<{ latestVersion: string; releaseDate: string }> {
  try {
    // Parse group:artifact format
    const [groupId, artifactId] = name.split(':')
    if (!groupId || !artifactId) {
      return { latestVersion: 'unknown', releaseDate: 'unknown' }
    }
    
    const searchUrl = `https://search.maven.org/solrsearch/select?q=g:"${groupId}"+AND+a:"${artifactId}"&rows=1&wt=json`
    const response = await fetch(searchUrl)
    if (!response.ok) throw new Error('Package not found')
    
    const data = await response.json()
    const doc = data.response?.docs?.[0]
    
    if (!doc) {
      return { latestVersion: 'unknown', releaseDate: 'unknown' }
    }
    
    return {
      latestVersion: doc.latestVersion || doc.v || 'unknown',
      releaseDate: doc.timestamp ? new Date(doc.timestamp).toISOString().split('T')[0] : 'unknown'
    }
  } catch (error) {
    console.warn(`Failed to fetch maven info for ${name}:`, error)
    return { latestVersion: 'unknown', releaseDate: 'unknown' }
  }
}

// Helper function to fetch CPAN package info
async function fetchCpanVersion(moduleName: string): Promise<{ latestVersion: string; releaseDate: string }> {
  try {
    const response = await fetch(`https://fastapi.metacpan.org/v1/release/${moduleName}`)
    if (!response.ok) throw new Error('Module not found')
    
    const data = await response.json()
    
    return {
      latestVersion: data.version || 'unknown',
      releaseDate: data.date ? new Date(data.date).toISOString().split('T')[0] : 'unknown'
    }
  } catch (error) {
    console.warn(`Failed to fetch CPAN info for ${moduleName}:`, error)
    return { latestVersion: 'unknown', releaseDate: 'unknown' }
  }
}

// Helper function for Ant packages (limited support)
async function fetchAntVersion(name: string): Promise<{ latestVersion: string; releaseDate: string }> {
  // Ant packages are typically distributed manually, so we provide limited support
  const knownAntPackages: Record<string, { version: string; date: string }> = {
    'ant': { version: '1.10.14', date: '2023-08-16' },
    'ant-contrib': { version: '1.0b3', date: '2006-11-02' },
    'ivy': { version: '2.5.2', date: '2023-04-15' }
  }
  
  const packageInfo = knownAntPackages[name.toLowerCase()]
  if (packageInfo) {
    return {
      latestVersion: packageInfo.version,
      releaseDate: packageInfo.date
    }
  }
  
  return { latestVersion: 'unknown', releaseDate: 'unknown' }
}

// Helper function for ChemAxon packages (limited support)
async function fetchChemAxonVersion(name: string): Promise<{ latestVersion: string; releaseDate: string }> {
  // ChemAxon packages are proprietary, so we provide limited mock data
  const knownChemAxonPackages: Record<string, { version: string; date: string }> = {
    'chemaxon-jchem': { version: '23.15.0', date: '2023-07-15' },
    'chemaxon-marvin': { version: '23.15.0', date: '2023-07-15' },
    'chemaxon-jklustor': { version: '23.15.0', date: '2023-07-15' },
    'chemaxon-standardizer': { version: '23.15.0', date: '2023-07-15' }
  }
  
  // Try to match package name (case insensitive)
  const packageKey = Object.keys(knownChemAxonPackages).find(key => 
    name.toLowerCase().includes(key.replace('chemaxon-', ''))
  )
  
  if (packageKey) {
    const packageInfo = knownChemAxonPackages[packageKey]
    return {
      latestVersion: packageInfo.version,
      releaseDate: packageInfo.date
    }
  }
  
  return { latestVersion: 'unknown', releaseDate: 'unknown' }
}

// Main function to enrich a single library
async function enrichLibrary(lib: LibraryInput): Promise<EnrichedLibrary> {
  let versionInfo: { latestVersion: string; releaseDate: string }
  
  switch (lib.type) {
    case 'npm':
      versionInfo = await fetchNpmVersion(lib.name)
      break
    case 'maven':
    case 'gradle':
      versionInfo = await fetchMavenVersion(lib.name)
      break
    case 'cpan':
      versionInfo = await fetchCpanVersion(lib.name)
      break
    case 'ant':
      versionInfo = await fetchAntVersion(lib.name)
      break
    case 'chemaxon':
      versionInfo = await fetchChemAxonVersion(lib.name)
      break
    default:
      versionInfo = { latestVersion: 'unknown', releaseDate: 'unknown' }
  }
  
  // Get EOL date using centralized logic
  const eolDate = getEolDate(lib.name, versionInfo.latestVersion, lib.type)
  console.log(`EOL check for ${lib.name} (${lib.type}) v${versionInfo.latestVersion}: ${eolDate}`)
  
  // Get security vulnerability information
  const security = await fetchVulnerabilities(lib.name, lib.currentVersion, lib.type)
  console.log(`Security check for ${lib.name} v${lib.currentVersion}: ${security.count} vulnerabilities, severity: ${security.severity}`)
  
  return {
    name: lib.name,
    currentVersion: lib.currentVersion,
    latestVersion: versionInfo.latestVersion,
    releaseDate: versionInfo.releaseDate,
    eolDate: eolDate || undefined,
    security
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VersionsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed`
    })
  }

  try {
    // Load EOL data at the start of processing
    await loadEolData()
    
    const { libs }: VersionsRequest = req.body
    
    if (!libs || !Array.isArray(libs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: libs array is required'
      })
    }

    // Process all libraries in parallel for better performance
    const enrichmentPromises = libs.map(lib => enrichLibrary(lib))
    const enriched = await Promise.all(enrichmentPromises)
    
    return res.status(200).json({
      success: true,
      enriched
    })
    
  } catch (error) {
    console.error('Versions API error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}
