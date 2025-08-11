import type { NextApiRequest, NextApiResponse } from 'next'
import AdmZip from 'adm-zip'
import simpleGit from 'simple-git'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import xml2js from 'xml2js'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface Library {
  name: string
  currentVersion: string
  type: 'npm' | 'maven' | 'gradle' | 'cpan' | 'ant' | 'chemaxon'
}

interface ScanResponse {
  project: string
  libs: Library[]
}

type ResponseData = {
  success: boolean
  message?: string
  data?: ScanResponse
  error?: string
}

// Helper function to create temporary directory
async function createTempDir(): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `codecare-scan-${Date.now()}`)
  await fs.mkdir(tempDir, { recursive: true })
  return tempDir
}

// Helper function to clean up temporary directory
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true })
  } catch (error) {
    console.warn(`Failed to cleanup temp dir ${tempDir}:`, error)
  }
}

// Helper function to recursively find files
async function findFiles(dir: string, fileNames: string[]): Promise<string[]> {
  const files: string[] = []
  
  async function scan(currentDir: string) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name)
        
        if (entry.isDirectory()) {
          // Skip common directories that shouldn't contain manifest files
          if (!['node_modules', '.git', 'target', 'build', 'dist'].includes(entry.name)) {
            await scan(fullPath)
          }
        } else if (entry.isFile()) {
          if (fileNames.some(fileName => 
            entry.name === fileName || 
            entry.name.endsWith('.properties') ||
            entry.name.endsWith('.xml')
          )) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`Error scanning directory ${currentDir}:`, error)
    }
  }
  
  await scan(dir)
  return files
}

// Parse package.json
async function parsePackageJson(filePath: string): Promise<Library[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
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
    console.warn(`Error parsing package.json at ${filePath}:`, error)
    return []
  }
}

// Parse pom.xml
async function parsePomXml(filePath: string): Promise<Library[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(content)
    const libs: Library[] = []
    
    if (result.project?.dependencies?.[0]?.dependency) {
      const dependencies = result.project.dependencies[0].dependency
      
      for (const dep of dependencies) {
        if (dep.groupId && dep.artifactId && dep.version) {
          const groupId = Array.isArray(dep.groupId) ? dep.groupId[0] : dep.groupId
          const artifactId = Array.isArray(dep.artifactId) ? dep.artifactId[0] : dep.artifactId
          const version = Array.isArray(dep.version) ? dep.version[0] : dep.version
          
          libs.push({
            name: `${groupId}:${artifactId}`,
            currentVersion: version,
            type: 'maven'
          })
        }
      }
    }
    
    return libs
  } catch (error) {
    console.warn(`Error parsing pom.xml at ${filePath}:`, error)
    return []
  }
}

// Parse build.gradle
async function parseBuildGradle(filePath: string): Promise<Library[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const libs: Library[] = []
    
    // Regex patterns for different gradle dependency formats
    const patterns = [
      /implementation\s+['"]([\w.-]+):([\w.-]+):([\w.-]+)['"]/g,
      /compile\s+['"]([\w.-]+):([\w.-]+):([\w.-]+)['"]/g,
      /testImplementation\s+['"]([\w.-]+):([\w.-]+):([\w.-]+)['"]/g,
      /api\s+['"]([\w.-]+):([\w.-]+):([\w.-]+)['"]/g
    ]
    
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        libs.push({
          name: `${match[1]}:${match[2]}`,
          currentVersion: match[3],
          type: 'gradle'
        })
      }
    }
    
    return libs
  } catch (error) {
    console.warn(`Error parsing build.gradle at ${filePath}:`, error)
    return []
  }
}

// Parse cpanfile
async function parseCpanfile(filePath: string): Promise<Library[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const libs: Library[] = []
    
    // Regex for cpanfile requires statements
    const requiresPattern = /requires\s+['"]([^'"]+)['"]\s*=>\s*['"]([^'"]+)['"]/g
    
    let match
    while ((match = requiresPattern.exec(content)) !== null) {
      libs.push({
        name: match[1],
        currentVersion: match[2],
        type: 'cpan'
      })
    }
    
    return libs
  } catch (error) {
    console.warn(`Error parsing cpanfile at ${filePath}:`, error)
    return []
  }
}

// Parse build.xml (Ant)
async function parseBuildXml(filePath: string): Promise<Library[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parser = new xml2js.Parser()
    const result = await parser.parseStringPromise(content)
    const libs: Library[] = []
    
    // Look for taskdef and property elements with version information
    function searchForVersions(obj: any, currentPath: string = '') {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => searchForVersions(item, `${currentPath}[${index}]`))
        } else {
          Object.keys(obj).forEach(key => {
            if (key === '$' && obj[key].name && obj[key].version) {
              libs.push({
                name: obj[key].name,
                currentVersion: obj[key].version,
                type: 'ant'
              })
            }
            searchForVersions(obj[key], `${currentPath}.${key}`)
          })
        }
      }
    }
    
    searchForVersions(result)
    return libs
  } catch (error) {
    console.warn(`Error parsing build.xml at ${filePath}:`, error)
    return []
  }
}

// Parse Chemaxon configs
async function parseChemaxonConfig(filePath: string): Promise<Library[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const libs: Library[] = []
    
    if (filePath.endsWith('.properties')) {
      // Parse properties file
      const versionPattern = /([\w.-]+)\.version\s*=\s*([\w.-]+)/g
      let match
      while ((match = versionPattern.exec(content)) !== null) {
        libs.push({
          name: match[1],
          currentVersion: match[2],
          type: 'chemaxon'
        })
      }
    } else if (filePath.endsWith('.xml')) {
      // Parse XML for version attributes
      const versionPattern = /version\s*=\s*["']([\w.-]+)["']/g
      let match
      while ((match = versionPattern.exec(content)) !== null) {
        libs.push({
          name: path.basename(filePath, '.xml'),
          currentVersion: match[1],
          type: 'chemaxon'
        })
      }
    }
    
    return libs
  } catch (error) {
    console.warn(`Error parsing Chemaxon config at ${filePath}:`, error)
    return []
  }
}

// Main scanning function
async function scanDirectory(dir: string): Promise<Library[]> {
  const manifestFiles = [
    'package.json',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'cpanfile',
    'build.xml'
  ]
  
  const foundFiles = await findFiles(dir, manifestFiles)
  const allLibs: Library[] = []
  
  for (const file of foundFiles) {
    const fileName = path.basename(file)
    
    if (fileName === 'package.json') {
      const libs = await parsePackageJson(file)
      allLibs.push(...libs)
    } else if (fileName === 'pom.xml') {
      const libs = await parsePomXml(file)
      allLibs.push(...libs)
    } else if (fileName.includes('build.gradle')) {
      const libs = await parseBuildGradle(file)
      allLibs.push(...libs)
    } else if (fileName === 'cpanfile') {
      const libs = await parseCpanfile(file)
      allLibs.push(...libs)
    } else if (fileName === 'build.xml') {
      const libs = await parseBuildXml(file)
      allLibs.push(...libs)
    } else if (fileName.endsWith('.properties') || fileName.endsWith('.xml')) {
      const libs = await parseChemaxonConfig(file)
      allLibs.push(...libs)
    }
  }
  
  // Remove duplicates
  const uniqueLibs = allLibs.filter((lib, index, self) => 
    index === self.findIndex(l => l.name === lib.name && l.type === lib.type)
  )
  
  return uniqueLibs
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

  let tempDir: string | null = null

  try {
    // Handle ZIP upload only
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB limit
    })
    
    const [fields, files] = await form.parse(req)
    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file
    
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    tempDir = await createTempDir()
    
    // Extract ZIP
    const zip = new AdmZip(uploadedFile.filepath)
    zip.extractAllTo(tempDir, true)
    
    // Get project name from ZIP filename
    const projectName = path.basename(uploadedFile.originalFilename || 'unknown-project', '.zip')
    
    // Scan for dependencies
    const libs = await scanDirectory(tempDir)
    
    return res.status(200).json({
      success: true,
      data: {
        project: projectName,
        libs
      }
    })
    
  } catch (error) {
    console.error('Scan error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await cleanupTempDir(tempDir)
    }
  }
}
