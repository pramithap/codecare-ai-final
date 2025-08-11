import type { ServiceComponent } from '../../../types/scanNew';
import { FLAGGED_COORDINATES, JAVA_LTS_VERSIONS } from '../../../types/scanNew';

export function parseGradleBuild(content: string): {
  components: ServiceComponent[];
  runtime?: string;
  runtimeVersion?: string;
  eol?: boolean;
} {
  try {
    const components: ServiceComponent[] = [];
    
    // Parse dependencies using regex patterns
    const dependencyPatterns = [
      // implementation 'group:artifact:version'
      /(?:implementation|api|compile|runtimeOnly|testImplementation|testCompile)\s*[\('\"]([^:'"]+):([^:'"]+):([^'"]+)[\)'\"]/g,
      // implementation group: 'group', name: 'artifact', version: 'version'
      /(?:implementation|api|compile|runtimeOnly|testImplementation|testCompile)\s*group:\s*[\'\"]([^\'\"]+)[\'\"],\s*name:\s*[\'\"]([^\'\"]+)[\'\"],\s*version:\s*[\'\"]([^\'\"]+)[\'\"]/g,
    ];

    dependencyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const [, groupId, artifactId, version] = match;
        const coord = `${groupId}:${artifactId}`;
        
        // Determine dependency type from the configuration
        const fullMatch = match[0];
        let type: ServiceComponent['type'] = 'dependency';
        if (fullMatch.includes('test')) {
          type = 'devDependency';
        }
        
        components.push({
          name: coord,
          version: cleanGradleVersion(version),
          type,
          cveCount: 0,
          flagged: isFlaggedCoordinate(groupId, artifactId),
          flagReason: getFlagReason(groupId, artifactId),
        });
      }
    });

    // Extract Java version
    const { runtime, runtimeVersion, eol } = extractJavaVersionFromGradle(content);

    return {
      components: components.slice(0, 100), // Limit for performance
      runtime,
      runtimeVersion,
      eol,
    };
  } catch (error) {
    console.error('Failed to parse Gradle build file:', error);
    return { components: [] };
  }
}

function extractJavaVersionFromGradle(content: string): {
  runtime?: string;
  runtimeVersion?: string;
  eol?: boolean;
} {
  // Look for sourceCompatibility/targetCompatibility
  const compatibilityPatterns = [
    /sourceCompatibility\s*=\s*[\'\"]?([^\'\"]+)[\'\"]?/,
    /targetCompatibility\s*=\s*[\'\"]?([^\'\"]+)[\'\"]?/,
    /JavaVersion\.VERSION_(\d+)/,
    /compileJava\s*\{\s*sourceCompatibility\s*=\s*[\'\"]?([^\'\"]+)[\'\"]?/,
    /java\s*\{\s*sourceCompatibility\s*=\s*[\'\"]?([^\'\"]+)[\'\"]?/,
  ];

  for (const pattern of compatibilityPatterns) {
    const match = content.match(pattern);
    if (match) {
      let version = match[1];
      
      // Handle JavaVersion.VERSION_X format
      if (pattern.source.includes('JavaVersion')) {
        version = match[1];
      }
      
      // Clean version string
      version = version.replace(/^1\./, ''); // Remove 1. prefix for old Java versions
      
      const majorVersion = version.split('.')[0];
      const eol = !JAVA_LTS_VERSIONS.includes(majorVersion as any) && 
                  (parseInt(majorVersion) < 11 || isOldJavaVersion(majorVersion));
      
      return {
        runtime: 'java',
        runtimeVersion: version,
        eol,
      };
    }
  }

  return {};
}

function cleanGradleVersion(version: string): string {
  // Remove Gradle-specific version notations
  return version
    .replace(/^\$\{[^}]+\}$/, 'property') // Handle property references
    .replace(/^[\[\(]/, '') // Remove range brackets
    .replace(/[\]\)]$/, '')
    .split(',')[0] // Take first version in range
    .trim();
}

function isFlaggedCoordinate(groupId: string, artifactId: string): boolean {
  return (
    FLAGGED_COORDINATES.axis2.some(coord => groupId.includes(coord) || artifactId.includes(coord)) ||
    FLAGGED_COORDINATES.chemaxon.some(coord => groupId.includes(coord) || artifactId.includes(coord))
  );
}

function getFlagReason(groupId: string, artifactId: string): string | undefined {
  if (FLAGGED_COORDINATES.axis2.some(coord => groupId.includes(coord) || artifactId.includes(coord))) {
    return 'Apache Axis2 - Legacy SOAP framework with known security issues';
  }
  
  if (FLAGGED_COORDINATES.chemaxon.some(coord => groupId.includes(coord) || artifactId.includes(coord))) {
    return 'ChemAxon - Commercial chemical informatics library';
  }
  
  return undefined;
}

function isOldJavaVersion(majorVersion: string): boolean {
  const version = parseInt(majorVersion);
  const currentYear = new Date().getFullYear();
  
  // Same logic as Maven parser
  if (version === 9 || version === 10) return true;
  if (version === 12 || version === 13 || version === 14 || version === 15 || version === 16) return true;
  if (version === 18 || version === 19 || version === 20) return currentYear > 2024;
  
  return false;
}
