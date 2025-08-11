import type { NextApiRequest, NextApiResponse } from 'next'

interface LibraryInput {
  name: string
  currentVersion: string
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon'
}

interface CompatibilityCell {
  score: number
  rationale: string
  status: 'compatible' | 'minor-issues' | 'major-issues'
}

interface CompatibilityMatrix {
  libraries: string[]
  matrix: CompatibilityCell[][]
}

interface CompatibilityRequest {
  libs: LibraryInput[]
  project?: string
}

interface CompatibilityResponse {
  success: boolean
  project?: string
  matrix?: CompatibilityMatrix
  error?: string
}

// Mock compatibility analysis function
async function analyzeCompatibility(lib1: LibraryInput, lib2: LibraryInput): Promise<CompatibilityCell> {
  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Mock compatibility scoring logic
  let score = 85 // Default good compatibility
  let rationale = `${lib1.name} and ${lib2.name} are generally compatible`
  
  // Same library always 100% compatible
  if (lib1.name === lib2.name) {
    return {
      score: 100,
      rationale: `${lib1.name} is compatible with itself`,
      status: 'compatible'
    }
  }
  
  // Cross-ecosystem compatibility tends to be lower
  if (lib1.type !== lib2.type) {
    score = Math.random() * 30 + 40 // 40-70%
    rationale = `Cross-ecosystem compatibility between ${lib1.type} and ${lib2.type} may require additional integration work`
  } else {
    // Same ecosystem - better compatibility
    score = Math.random() * 40 + 60 // 60-100%
  }
  
  // Known problematic combinations
  const problematic = [
    ['react', 'angular'],
    ['spring-boot', 'express'],
    ['maven', 'gradle']
  ]
  
  const isProblem = problematic.some(([a, b]) => 
    (lib1.name.toLowerCase().includes(a) && lib2.name.toLowerCase().includes(b)) ||
    (lib1.name.toLowerCase().includes(b) && lib2.name.toLowerCase().includes(a))
  )
  
  if (isProblem) {
    score = Math.random() * 30 + 10 // 10-40%
    rationale = `${lib1.name} and ${lib2.name} may have compatibility conflicts and should be used with caution`
  }
  
  // Version-based scoring adjustments
  const version1Major = parseInt(lib1.currentVersion.split('.')[0] || '1')
  const version2Major = parseInt(lib2.currentVersion.split('.')[0] || '1')
  
  if (Math.abs(version1Major - version2Major) > 2) {
    score *= 0.8 // Reduce score for major version differences
    rationale += `. Major version differences (${lib1.currentVersion} vs ${lib2.currentVersion}) may cause issues`
  }
  
  // Determine status based on score
  let status: 'compatible' | 'minor-issues' | 'major-issues'
  if (score >= 80) {
    status = 'compatible'
  } else if (score >= 50) {
    status = 'minor-issues'
  } else {
    status = 'major-issues'
  }
  
  return {
    score: Math.round(score),
    rationale,
    status
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompatibilityResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed`
    })
  }

  try {
    const { libs, project }: CompatibilityRequest = req.body
    
    if (!libs || !Array.isArray(libs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: libs array is required'
      })
    }

    console.log(`Analyzing compatibility for ${libs.length} libraries...`)
    
    // Create compatibility matrix
    const libraries = libs.map(lib => lib.name)
    const matrix: CompatibilityCell[][] = []
    
    // Generate matrix - each library compared against every other library
    for (let i = 0; i < libs.length; i++) {
      const row: CompatibilityCell[] = []
      
      for (let j = 0; j < libs.length; j++) {
        const cell = await analyzeCompatibility(libs[i], libs[j])
        row.push(cell)
      }
      
      matrix.push(row)
    }
    
    console.log(`Compatibility analysis complete: ${libraries.length}x${libraries.length} matrix`)
    
    return res.status(200).json({
      success: true,
      project: project || 'Unknown Project',
      matrix: {
        libraries,
        matrix
      }
    })
    
  } catch (error) {
    console.error('Compatibility API error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}
