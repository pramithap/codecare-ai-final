import { XMLParser } from 'fast-xml-parser';
import type { ServiceComponent } from '../../../types/scanNew';
import { FLAGGED_COORDINATES, JAVA_LTS_VERSIONS } from '../../../types/scanNew';

export interface MavenPom {
  project?: {
    groupId?: string;
    artifactId?: string;
    version?: string;
    properties?: Record<string, any>;
    dependencies?: {
      dependency?: Array<{
        groupId?: string;
        artifactId?: string;
        version?: string;
        scope?: string;
      }> | {
        groupId?: string;
        artifactId?: string;
        version?: string;
        scope?: string;
      };
    };
    dependencyManagement?: {
      dependencies?: {
        dependency?: Array<{
          groupId?: string;
          artifactId?: string;
          version?: string;
          scope?: string;
        }> | {
          groupId?: string;
          artifactId?: string;
          version?: string;
          scope?: string;
        };
      };
    };
    build?: {
      plugins?: {
        plugin?: Array<{
          groupId?: string;
          artifactId?: string;
          version?: string;
          configuration?: any;
        }> | {
          groupId?: string;
          artifactId?: string;
          version?: string;
          configuration?: any;
        };
      };
    };
  };
}

export function parsePomXml(content: string): {
  components: ServiceComponent[];
  runtime?: string;
  runtimeVersion?: string;
  eol?: boolean;
} {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      trimValues: true,
    });

    const pom: MavenPom = parser.parse(content);
    const components: ServiceComponent[] = [];

    if (!pom.project) {
      return { components: [] };
    }

    const properties = pom.project.properties || {};

    // Parse dependencies
    const deps = normalizeDependencyArray(pom.project.dependencies?.dependency);
    const managedDeps = normalizeDependencyArray(pom.project.dependencyManagement?.dependencies?.dependency);

    // Process regular dependencies
    deps.forEach(dep => {
      if (dep.groupId && dep.artifactId) {
        const version = resolveVersion(dep.version, properties);
        const coord = `${dep.groupId}:${dep.artifactId}`;
        const cleanVersion = version || 'unknown';
        const latestVersion = cleanVersion !== 'unknown' ? generateMockMavenLatestVersion(coord, cleanVersion) : undefined;
        
        // Mock EOL detection for very old versions
        const isEol = ['junit:junit'].includes(coord) && cleanVersion.startsWith('3.');
        
        // Mock CVE data
        const cveCount = ['org.apache.commons:commons-collections'].includes(coord) ? Math.floor(Math.random() * 2) + 1 : 0;
        
        components.push({
          name: coord,
          version: cleanVersion,
          latestVersion,
          type: dep.scope === 'test' ? 'devDependency' : 'dependency',
          scope: dep.scope,
          cveCount,
          eol: isEol,
          flagged: isFlaggedCoordinate(dep.groupId, dep.artifactId) || isEol || cveCount > 0,
          flagReason: getFlagReason(dep.groupId, dep.artifactId) || (isEol ? 'End of Life' : cveCount > 0 ? 'Security vulnerabilities' : undefined),
        });
      }
    });

    // Process managed dependencies (usually parent/BOM imports)
    managedDeps.forEach(dep => {
      if (dep.groupId && dep.artifactId) {
        const version = resolveVersion(dep.version, properties);
        const coord = `${dep.groupId}:${dep.artifactId}`;
        const cleanVersion = version || 'unknown';
        const latestVersion = cleanVersion !== 'unknown' ? generateMockMavenLatestVersion(coord, cleanVersion) : undefined;
        
        components.push({
          name: coord,
          version: cleanVersion,
          latestVersion,
          type: 'buildDependency',
          scope: 'management',
          cveCount: 0,
          flagged: isFlaggedCoordinate(dep.groupId, dep.artifactId),
          flagReason: getFlagReason(dep.groupId, dep.artifactId),
        });
      }
    });

    // Extract Java version from maven-compiler-plugin
    const { runtime, runtimeVersion, eol } = extractJavaVersion(pom.project, properties);

    return {
      components: components.slice(0, 100), // Limit components for performance
      runtime,
      runtimeVersion,
      eol,
    };
  } catch (error) {
    console.error('Failed to parse pom.xml:', error);
    return { components: [] };
  }
}

function normalizeDependencyArray(deps: any): Array<{
  groupId?: string;
  artifactId?: string;
  version?: string;
  scope?: string;
}> {
  if (!deps) return [];
  return Array.isArray(deps) ? deps : [deps];
}

function normalizePluginArray(plugins: any): Array<{
  groupId?: string;
  artifactId?: string;
  version?: string;
  configuration?: any;
}> {
  if (!plugins) return [];
  return Array.isArray(plugins) ? plugins : [plugins];
}

function resolveVersion(version: string | undefined, properties: Record<string, any>): string {
  if (!version) return 'unknown';
  
  // Resolve ${property} references
  const propertyMatch = version.match(/\$\{([^}]+)\}/);
  if (propertyMatch) {
    const propertyName = propertyMatch[1];
    return properties[propertyName] || version;
  }
  
  return version;
}

function extractJavaVersion(project: MavenPom['project'], properties: Record<string, any>): {
  runtime?: string;
  runtimeVersion?: string;
  eol?: boolean;
} {
  if (!project?.build?.plugins) {
    return {};
  }

  const plugins = normalizePluginArray(project.build.plugins.plugin);
  const compilerPlugin = plugins.find(p => 
    p.artifactId === 'maven-compiler-plugin' || 
    (p.groupId === 'org.apache.maven.plugins' && p.artifactId === 'maven-compiler-plugin')
  );

  if (compilerPlugin?.configuration) {
    const config = compilerPlugin.configuration;
    const source = config.source || config.maven?.compiler?.source || properties['maven.compiler.source'];
    const target = config.target || config.maven?.compiler?.target || properties['maven.compiler.target'];
    
    const version = target || source;
    if (version) {
      const majorVersion = version.toString().split('.')[0];
      const eol = !JAVA_LTS_VERSIONS.includes(majorVersion as any) && 
                  (parseInt(majorVersion) < 11 || isOldJavaVersion(majorVersion));
      
      return {
        runtime: 'java',
        runtimeVersion: version.toString(),
        eol,
      };
    }
  }

  return {};
}

function isFlaggedCoordinate(groupId?: string, artifactId?: string): boolean {
  if (!groupId || !artifactId) return false;
  
  return (
    FLAGGED_COORDINATES.axis2.some(coord => groupId.includes(coord) || artifactId.includes(coord)) ||
    FLAGGED_COORDINATES.chemaxon.some(coord => groupId.includes(coord) || artifactId.includes(coord))
  );
}

function getFlagReason(groupId?: string, artifactId?: string): string | undefined {
  if (!groupId || !artifactId) return undefined;
  
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
  
  // Rough heuristic: versions between LTS and >2 years old are likely EOL
  if (version === 9 || version === 10) return true; // These are definitely EOL
  if (version === 12 || version === 13 || version === 14 || version === 15 || version === 16) return true;
  if (version === 18 || version === 19 || version === 20) return currentYear > 2024; // Short-lived versions
  
  return false;
}

// Mock function to generate latest versions for Maven artifacts
function generateMockMavenLatestVersion(coordinate: string, currentVersion: string): string {
  const mockVersions: Record<string, string> = {
    'org.springframework:spring-core': '6.1.5',
    'org.springframework.boot:spring-boot-starter': '3.2.4',
    'junit:junit': '4.13.2',
    'org.junit.jupiter:junit-jupiter': '5.10.2',
    'com.fasterxml.jackson.core:jackson-core': '2.17.0',
    'org.apache.commons:commons-lang3': '3.14.0',
    'org.slf4j:slf4j-api': '2.0.12',
    'ch.qos.logback:logback-classic': '1.5.3',
    'org.hibernate:hibernate-core': '6.4.4.Final',
    'org.apache.maven.plugins:maven-compiler-plugin': '3.13.0'
  };
  
  // Return mock version if available
  if (mockVersions[coordinate]) {
    return mockVersions[coordinate];
  }
  
  // Simple version increment logic for demo
  const versionParts = currentVersion.split('.');
  if (versionParts.length >= 2) {
    const minor = parseInt(versionParts[1]) || 0;
    versionParts[1] = (minor + Math.floor(Math.random() * 3) + 1).toString();
    return versionParts.join('.');
  }
  
  return currentVersion;
}
