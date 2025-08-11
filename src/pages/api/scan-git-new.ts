import type { NextApiRequest, NextApiResponse } from 'next'
import xml2js from 'xml2js'
import { addScan, generateScanId, type ScanRecord } from '../../lib/scanStorage'

interface Library {
  name: string
  currentVersion: string
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon'
}

interface ScanResponse {
  project: string
  libs: Library[]
  scanId?: string
}

type ResponseData = {
  success: boolean
  message?: string
  data?: ScanResponse
  error?: string
}

// Helper function to fetch file content from GitHub API
async function fetchGitHubFileContent(repoUrl: string, filePath: string): Promise<string | null> {
  try {
    // Convert GitHub URL to API URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/)
    if (!match) return null
    
    const [, owner, repo] = match
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`
    
    const response = await fetch(apiUrl)
    if (!response.ok) return null
    
    const data = await response.json()
    if (data.type === 'file' && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    
    return null
  } catch (error) {
    console.warn(`Failed to fetch ${filePath}:`, error)
    return null
  }
}

// Helper function to get repository file tree
async function getRepoFileTree(repoUrl: string): Promise<string[]> {
  try {
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/)
    if (!match) return []
    
    const [, owner, repo] = match
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
    
    const response = await fetch(apiUrl)
    if (!response.ok) return []
    
    const data = await response.json()
    return data.tree
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => item.path)
  } catch (error) {
    console.warn('Failed to fetch repository tree:', error)
    return []
  }
}

// Parse package.json
async function parsePackageJson(content: string): Promise<Library[]> {
  try {
    const packageJson = JSON.parse(content)
    const libs: Library[] = []
    
    // Parse dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        libs.push({
          name,
          currentVersion: (version as string).replace(/^[\^~]/, ''),
          type: 'npm'
        })
      }
    }
    
    // Parse devDependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        libs.push({
          name,
          currentVersion: (version as string).replace(/^[\^~]/, ''),
          type: 'npm'
        })
      }
    }
    
    return libs
  } catch (error) {
    console.warn('Error parsing package.json:', error)
    return []
  }
}

// Parse pom.xml
async function parsePomXml(content: string): Promise<Library[]> {
  try {
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(content)
    const libs: Library[] = []
    
    // Check if it's a ChemAxon project
    const isChemAxon = content.includes('chemaxon') || content.includes('ChemAxon')
    const type = isChemAxon ? 'chemaxon' : 'maven'
    
    if (result.project?.dependencies?.[0]?.dependency) {
      for (const dep of result.project.dependencies[0].dependency) {
        const groupId = dep.groupId?.[0] || ''
        const artifactId = dep.artifactId?.[0] || ''
        const version = dep.version?.[0] || ''
        
        if (groupId && artifactId && version) {
          libs.push({
            name: `${groupId}:${artifactId}`,
            currentVersion: version,
            type
          })
        }
      }
    }
    
    return libs
  } catch (error) {
    console.warn('Error parsing pom.xml:', error)
    return []
  }
}

// Parse build.gradle
async function parseBuildGradle(content: string): Promise<Library[]> {
  try {
    const libs: Library[] = []
    const lines = content.split('\n')
    
    // Regex patterns for different Gradle dependency formats
    const patterns = [
      /(?:implementation|compile|api|testImplementation)\s+['"]([^:]+):([^:]+):([^'"]+)['"]/g,
      /(?:implementation|compile|api|testImplementation)\s+group:\s*['"]([^'"]+)['"],\s*name:\s*['"]([^'"]+)['"],\s*version:\s*['"]([^'"]+)['"]/g
    ]
    
    for (const line of lines) {
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(line)) !== null) {
          const [, group, artifact, version] = match
          libs.push({
            name: `${group}:${artifact}`,
            currentVersion: version,
            type: 'gradle'
          })
        }
      }
    }
    
    return libs
  } catch (error) {
    console.warn('Error parsing build.gradle:', error)
    return []
  }
}

// Parse cpanfile
async function parseCpanfile(content: string): Promise<Library[]> {
  try {
    const libs: Library[] = []
    const lines = content.split('\n')
    
    // Regex for requires 'Module' => 'version'
    const requiresPattern = /requires\s+['"]([^'"]+)['"]\s*=>\s*['"]([^'"]+)['"]/g
    
    for (const line of lines) {
      let match
      while ((match = requiresPattern.exec(line)) !== null) {
        const [, module, version] = match
        libs.push({
          name: module,
          currentVersion: version,
          type: 'cpan'
        })
      }
    }
    
    return libs
  } catch (error) {
    console.warn('Error parsing cpanfile:', error)
    return []
  }
}

// Parse build.xml (Ant)
async function parseBuildXml(content: string): Promise<Library[]> {
  try {
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(content)
    const libs: Library[] = []
    
    // Look for taskdef or property elements with version information
    const findVersions = (obj: any) => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.forEach(findVersions)
        } else {
          for (const [key, value] of Object.entries(obj)) {
            if (key === 'taskdef' || key === 'property') {
              if (Array.isArray(value)) {
                value.forEach((item: any) => {
                  if (item.$ && item.$.name && item.$.value) {
                    const name = item.$.name
                    const version = item.$.value
                    if (version.match(/^\d+\.\d+/)) {
                      libs.push({
                        name,
                        currentVersion: version,
                        type: 'ant'
                      })
                    }
                  }
                })
              }
            } else {
              findVersions(value)
            }
          }
        }
      }
    }
    
    findVersions(result)
    return libs
  } catch (error) {
    console.warn('Error parsing build.xml:', error)
    return []
  }
}

// Parse properties files (ChemAxon configs)
async function parsePropertiesFile(content: string): Promise<Library[]> {
  try {
    const libs: Library[] = []
    const lines = content.split('\n')
    
    // Regex for version= patterns
    const versionPattern = /([^=\s]+)\.?version\s*=\s*([^\s#]+)/g
    
    for (const line of lines) {
      let match
      while ((match = versionPattern.exec(line)) !== null) {
        const [, name, version] = match
        if (version.match(/^\d+\.\d+/)) {
          libs.push({
            name: name.replace('.version', ''),
            currentVersion: version,
            type: 'chemaxon'
          })
        }
      }
    }
    
    return libs
  } catch (error) {
    console.warn('Error parsing properties file:', error)
    return []
  }
}

// Main scanning function
async function scanRepository(repoUrl: string): Promise<Library[]> {
  const libs: Library[] = []
  
  // Get all files in the repository
  const files = await getRepoFileTree(repoUrl)
  
  // Define manifest files to look for
  const manifestFiles = [
    'package.json',
    'pom.xml',
    'build.gradle',
    'cpanfile',
    'build.xml'
  ]
  
  // Find and process manifest files
  for (const file of files) {
    const fileName = file.split('/').pop() || ''
    
    if (manifestFiles.includes(fileName)) {
      const content = await fetchGitHubFileContent(repoUrl, file)
      if (!content) continue
      
      switch (fileName) {
        case 'package.json':
          libs.push(...await parsePackageJson(content))
          break
        case 'pom.xml':
          libs.push(...await parsePomXml(content))
          break
        case 'build.gradle':
          libs.push(...await parseBuildGradle(content))
          break
        case 'cpanfile':
          libs.push(...await parseCpanfile(content))
          break
        case 'build.xml':
          libs.push(...await parseBuildXml(content))
          break
      }
    } else if (fileName.endsWith('.properties')) {
      // Check ChemAxon properties files
      const content = await fetchGitHubFileContent(repoUrl, file)
      if (content) {
        libs.push(...await parsePropertiesFile(content))
      }
    }
  }
  
  return libs
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed`
    })
  }

  try {
    const { gitUrl } = req.body
    
    if (!gitUrl || typeof gitUrl !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Git URL is required'
      })
    }

    // Validate GitHub URL
    if (!gitUrl.includes('github.com')) {
      return res.status(400).json({
        success: false,
        error: 'Currently only GitHub repositories are supported'
      })
    }
    
    // Scan repository for dependencies
    const libs = await scanRepository(gitUrl)
    
    // Get project name from Git URL
    const projectName = gitUrl.split('/').pop()?.replace('.git', '') || 'unknown-repo'
    
    // Create scan record for history
    const scanRecord: ScanRecord = {
      id: generateScanId(),
      repoName: projectName,
      repoUrl: gitUrl,
      branch: 'main', // Default, could be extracted from request in future
      commit: undefined, // Could be fetched from GitHub API
      scannedAt: new Date().toISOString(),
      libsTotal: libs.length,
      libsOutdated: libs.filter(lib => {
        // Simple heuristic - consider a lib outdated if it has version info
        // In real implementation, this would check against latest versions
        return Math.random() > 0.7; // Mock: ~30% are outdated
      }).length,
      vulns: {
        // Mock vulnerability data - in real implementation, check against security APIs
        low: Math.floor(Math.random() * 5),
        med: Math.floor(Math.random() * 3),
        high: Math.floor(Math.random() * 2)
      },
      eol: {
        // Mock EOL data
        overdue: Math.floor(Math.random() * 2),
        soon: Math.floor(Math.random() * 3)
      },
      compat: {
        // Mock compatibility data
        avg: Math.floor(Math.random() * 30 + 70),
        min: Math.floor(Math.random() * 40 + 40)
      },
      planReady: Math.random() > 0.3, // 70% chance plan is ready
      tags: ['auto-scan', 'github'],
      sampleLibs: libs.slice(0, 10).map(lib => {
        const randomSev = Math.random();
        let severity: 'Low' | 'Med' | 'High' | undefined;
        if (randomSev > 0.8) {
          severity = Math.random() > 0.5 ? 'High' : 'Med';
        } else if (randomSev > 0.5) {
          severity = 'Low';
        }
        
        return {
          name: lib.name,
          current: lib.currentVersion,
          latest: `${lib.currentVersion}.1`, // Mock latest version
          severity,
          eol: Math.random() > 0.9 ? '2025-12-31' : null
        };
      })
    };
    
    // Save scan to history
    try {
      addScan(scanRecord);
    } catch (error) {
      console.error('Failed to save scan to history:', error);
      // Don't fail the request if history save fails
    }
    
    return res.status(200).json({
      success: true,
      data: {
        project: projectName,
        libs,
        scanId: scanRecord.id // Include scan ID in response
      }
    })
    
  } catch (error) {
    console.error('Git scan error:', error)
    
    // Provide specific error messages for common issues
    let errorMessage = 'Internal server error'
    
    if (error instanceof Error) {
      if (error.message.includes('Not Found') || error.message.includes('404')) {
        errorMessage = 'Repository not found. Please check the Git URL and ensure the repository exists and is accessible.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'GitHub API rate limit exceeded. Please try again later.'
      } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
        errorMessage = 'Access denied. Please check if the repository is public.'
      } else {
        errorMessage = error.message
      }
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    })
  }
}
