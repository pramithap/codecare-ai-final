import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

interface Library {
  name: string
  currentVersion: string
  latestVersion: string
}

interface PlanStep {
  lib: string
  from: string
  to: string
  rationale: string
  diff: string
  testCommand: string
}

interface PlanRequest {
  libs: Library[]
  project: string
}

interface PlanResponse {
  project: string
  steps: PlanStep[]
}

type ResponseData = PlanResponse | { error: string }

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key', // Use demo key for development
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    return
  }

  try {
    const { libs, project }: PlanRequest = req.body

    if (!libs || !Array.isArray(libs) || libs.length === 0) {
      res.status(400).json({ error: 'Libraries array is required and cannot be empty' })
      return
    }

    if (!project) {
      res.status(400).json({ error: 'Project name is required' })
      return
    }

    // For demo purposes, if no OpenAI key is provided, use mock data
    if (!process.env.OPENAI_API_KEY) {
      const mockSteps = generateMockPlan(libs, project)
      res.status(200).json({
        project,
        steps: mockSteps
      })
      return
    }

    // Construct system prompt
    const systemPrompt = `You are an expert software upgrade assistant. Given a list of libraries with current and target versions, generate an ordered upgrade plan that minimizes breaking changes. For each step, include:
- lib: name
- from: currentVersion
- to: latestVersion
- rationale: one-sentence explanation "Why this order"
- diff: a sample unified diff snippet for the manifest change
- testCommand: appropriate test command (e.g. "npm test" or "mvn test")

Return ONLY a valid JSON object with a "steps" array. Do not include any markdown formatting or additional text.`

    // Construct user prompt
    const userPrompt = `Project: ${project}
Libraries to upgrade:
${libs.map(lib => `- ${lib.name}: ${lib.currentVersion} → ${lib.latestVersion}`).join('\n')}

Generate an upgrade plan that considers dependency relationships, breaking change risk, and optimal sequencing.`

    // Make API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Parse AI response
    let parsedResponse: { steps: PlanStep[] }
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback to mock data
      const mockSteps = generateMockPlan(libs, project)
      res.status(200).json({
        project,
        steps: mockSteps
      })
      return
    }

    // Validate response structure
    if (!parsedResponse.steps || !Array.isArray(parsedResponse.steps)) {
      throw new Error('Invalid AI response structure')
    }

    res.status(200).json({
      project,
      steps: parsedResponse.steps
    })

  } catch (error) {
    console.error('Error generating upgrade plan:', error)
    
    // Fallback to mock data on error
    try {
      const { libs, project } = req.body
      const mockSteps = generateMockPlan(libs, project)
      res.status(200).json({
        project,
        steps: mockSteps
      })
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to generate upgrade plan' })
    }
  }
}

// Enhanced mock plan generator for development/fallback
function generateMockPlan(libs: Library[], project: string): PlanStep[] {
  // Categorize libraries by type and importance
  const categorizeLibraries = (libraries: Library[]) => {
    const categories = {
      core: [] as Library[],
      framework: [] as Library[],
      utility: [] as Library[],
      testing: [] as Library[],
      dev: [] as Library[]
    }

    libraries.forEach(lib => {
      const name = lib.name.toLowerCase()
      if (name.includes('react') || name.includes('vue') || name.includes('angular') || 
          name.includes('spring') || name.includes('django') || name.includes('express')) {
        categories.framework.push(lib)
      } else if (name.includes('test') || name.includes('jest') || name.includes('mocha') || 
                 name.includes('junit') || name.includes('pytest')) {
        categories.testing.push(lib)
      } else if (name.includes('webpack') || name.includes('babel') || name.includes('eslint') || 
                 name.includes('typescript')) {
        categories.dev.push(lib)
      } else if (name.includes('lodash') || name.includes('axios') || name.includes('moment') ||
                 name.includes('uuid') || name.includes('chalk')) {
        categories.utility.push(lib)
      } else {
        categories.core.push(lib)
      }
    })

    return categories
  }

  // Calculate version jump magnitude
  const getVersionJumpMagnitude = (current: string, latest: string): 'patch' | 'minor' | 'major' => {
    try {
      const currentParts = current.split('.').map(Number)
      const latestParts = latest.split('.').map(Number)
      
      if (currentParts[0] !== latestParts[0]) return 'major'
      if (currentParts[1] !== latestParts[1]) return 'minor'
      return 'patch'
    } catch {
      return 'minor' // fallback
    }
  }

  // Generate intelligent rationale
  const getIntelligentRationale = (lib: Library, category: string, position: number, magnitude: string) => {
    const rationales: { [key: string]: string[] } = {
      framework: [
        `Start with ${lib.name} as it's a core framework dependency that other libraries depend on`,
        `Upgrade ${lib.name} early to establish the foundation for other framework components`,
        `${lib.name} framework upgrade should precede dependent library updates to avoid conflicts`
      ],
      core: [
        `${lib.name} is a foundational library that should be upgraded before dependent packages`,
        `Update ${lib.name} first as it provides core functionality used by other dependencies`,
        `Prioritize ${lib.name} to ensure stable base for subsequent upgrades`
      ],
      utility: [
        `${lib.name} is a utility library with minimal breaking changes, safe to upgrade mid-process`,
        `Update ${lib.name} after core dependencies but before testing frameworks`,
        `${lib.name} upgrade poses low risk and can be done alongside other utility updates`
      ],
      testing: [
        `Upgrade ${lib.name} after main dependencies to ensure tests remain compatible`,
        `${lib.name} testing framework should be updated last to validate all other changes`,
        `Update ${lib.name} to match the testing requirements of upgraded dependencies`
      ],
      dev: [
        `${lib.name} development tool can be upgraded independently of runtime dependencies`,
        `Update ${lib.name} to support new features in upgraded runtime libraries`,
        `${lib.name} dev dependency upgrade has minimal impact on production code`
      ]
    }

    let baseRationale = rationales[category]?.[position % rationales[category].length] || 
                       `Update ${lib.name} based on dependency analysis and risk assessment`

    // Add magnitude-specific context
    if (magnitude === 'major') {
      baseRationale += ' (Major version change - exercise caution)'
    } else if (magnitude === 'minor') {
      baseRationale += ' (Minor version update with new features)'
    } else {
      baseRationale += ' (Patch update with bug fixes)'
    }

    return baseRationale
  }

  // Generate more realistic diffs based on library type
  const generateSmartDiff = (lib: Library) => {
    const name = lib.name.toLowerCase()
    let filename = 'package.json'
    let content = 'dependencies'

    if (name.includes('spring') || name.includes('maven')) {
      filename = 'pom.xml'
      return `--- a/${filename}
+++ b/${filename}
@@ -15,7 +15,7 @@
     <dependency>
       <groupId>org.springframework</groupId>
       <artifactId>${lib.name}</artifactId>
-      <version>${lib.currentVersion}</version>
+      <version>${lib.latestVersion}</version>
     </dependency>`
    }

    if (name.includes('gradle')) {
      filename = 'build.gradle'
      return `--- a/${filename}
+++ b/${filename}
@@ -8,7 +8,7 @@
 
 dependencies {
-    implementation '${lib.name}:${lib.currentVersion}'
+    implementation '${lib.name}:${lib.latestVersion}'
     testImplementation 'junit:junit:4.13.2'
 }`
    }

    // Handle dev dependencies
    if (name.includes('test') || name.includes('dev') || name.includes('eslint') || name.includes('webpack')) {
      content = 'devDependencies'
    }

    return `--- a/${filename}
+++ b/${filename}
@@ -3,7 +3,7 @@
   "version": "1.0.0",
   "${content}": {
-    "${lib.name}": "${lib.currentVersion}",
+    "${lib.name}": "${lib.latestVersion}",
     "other-package": "^2.0.0"
   }
 }`
  }

  // Get appropriate test command
  const getTestCommand = (libName: string, category: string) => {
    const name = libName.toLowerCase()
    
    if (name.includes('spring') || name.includes('maven')) return 'mvn test'
    if (name.includes('gradle')) return './gradlew test'
    if (name.includes('django')) return 'python manage.py test'
    if (name.includes('flask') || name.includes('pytest')) return 'python -m pytest'
    if (name.includes('jest')) return 'npm run test'
    if (name.includes('mocha')) return 'npm run test:mocha'
    if (category === 'testing') return 'npm test'
    if (category === 'dev') return 'npm run build && npm test'
    
    return 'npm test'
  }

  // Sort libraries intelligently
  const categories = categorizeLibraries(libs)
  
  // Add risk-based sorting within categories
  const sortByRisk = (libraries: Library[]) => {
    return libraries.sort((a, b) => {
      const aRisk = getVersionJumpMagnitude(a.currentVersion, a.latestVersion)
      const bRisk = getVersionJumpMagnitude(b.currentVersion, b.latestVersion)
      
      // Sort by risk: patch < minor < major
      const riskOrder = { patch: 1, minor: 2, major: 3 }
      return riskOrder[aRisk] - riskOrder[bRisk]
    })
  }

  const sortedLibs: Array<{lib: Library, category: string}> = []

  // Add in intelligent order with risk-based sorting within each category
  sortByRisk(categories.framework).forEach(lib => sortedLibs.push({lib, category: 'framework'}))
  sortByRisk(categories.core).forEach(lib => sortedLibs.push({lib, category: 'core'}))
  sortByRisk(categories.utility).forEach(lib => sortedLibs.push({lib, category: 'utility'}))
  sortByRisk(categories.testing).forEach(lib => sortedLibs.push({lib, category: 'testing'}))
  sortByRisk(categories.dev).forEach(lib => sortedLibs.push({lib, category: 'dev'}))

  // Add some randomization to make plans feel more dynamic
  const addRandomization = (steps: any[]) => {
    // Occasionally swap adjacent low-risk items for variety
    const result = [...steps]
    for (let i = 0; i < result.length - 1; i++) {
      const current = getVersionJumpMagnitude(result[i].lib.currentVersion, result[i].lib.latestVersion)
      const next = getVersionJumpMagnitude(result[i + 1].lib.currentVersion, result[i + 1].lib.latestVersion)
      
      // Only swap if both are low risk and in same category type
      if (current === 'patch' && next === 'patch' && Math.random() < 0.3) {
        [result[i], result[i + 1]] = [result[i + 1], result[i]]
      }
    }
    return result
  }

  const randomizedLibs = addRandomization(sortedLibs)

  // Generate plan steps
  return randomizedLibs.map(({lib, category}, index) => {
    const magnitude = getVersionJumpMagnitude(lib.currentVersion, lib.latestVersion)
    
    return {
      lib: lib.name,
      from: lib.currentVersion,
      to: lib.latestVersion,
      rationale: getIntelligentRationale(lib, category, index, magnitude),
      diff: generateSmartDiff(lib),
      testCommand: getTestCommand(lib.name, category)
    }
  })
}
