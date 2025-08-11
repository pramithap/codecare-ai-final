import type { ServiceComponent } from '../../../types/scanNew';
import { NODE_EOL_VERSIONS, NODE_LTS_VERSIONS } from '../../../types/scanNew';

export interface NodeManifest {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
}

export function parsePackageJson(content: string): {
  components: ServiceComponent[];
  runtime?: string;
  runtimeVersion?: string;
  eol?: boolean;
} {
  try {
    // Check if content might be base64 encoded
    let jsonContent = content;
    if (content.startsWith('ewog') || /^[A-Za-z0-9+/=]+$/.test(content.substring(0, 100))) {
      try {
        jsonContent = Buffer.from(content, 'base64').toString('utf-8');
      } catch (decodeError) {
        // If base64 decode fails, use original content
        jsonContent = content;
      }
    }
    
    const manifest: NodeManifest = JSON.parse(jsonContent);
    const components: ServiceComponent[] = [];

    // Parse dependencies
    const deps = manifest.dependencies || {};
    const devDeps = manifest.devDependencies || {};
    const peerDeps = manifest.peerDependencies || {};

    // Add regular dependencies (limit to top 50 for performance)
    Object.entries(deps).slice(0, 50).forEach(([name, version]) => {
      const cleanedVersion = cleanVersion(version);
      const latestVersion = generateMockLatestVersion(name, cleanedVersion);
      
      // Mock EOL detection for certain old packages
      const isEol = ['jquery'].includes(name) && cleanedVersion.startsWith('1.');
      
      // Mock CVE data for demonstration
      const cveCount = ['lodash', 'minimist'].includes(name) ? Math.floor(Math.random() * 3) : 0;
      
      components.push({
        name,
        version: cleanedVersion,
        latestVersion,
        type: 'dependency',
        cveCount,
        eol: isEol,
        flagged: isEol || cveCount > 0,
        flagReason: isEol ? 'End of Life' : cveCount > 0 ? 'Security vulnerabilities' : undefined
      });
    });

    // Add dev dependencies (limit to top 30)
    Object.entries(devDeps).slice(0, 30).forEach(([name, version]) => {
      const cleanedVersion = cleanVersion(version);
      const latestVersion = generateMockLatestVersion(name, cleanedVersion);
      
      components.push({
        name,
        version: cleanedVersion,
        latestVersion,
        type: 'devDependency',
        cveCount: 0,
      });
    });

    // Add peer dependencies (limit to top 20)
    Object.entries(peerDeps).slice(0, 20).forEach(([name, version]) => {
      const cleanedVersion = cleanVersion(version);
      const latestVersion = generateMockLatestVersion(name, cleanedVersion);
      
      components.push({
        name,
        version: cleanedVersion,
        latestVersion,
        type: 'dependency',
        scope: 'peer',
        cveCount: 0,
      });
    });

    // Determine Node.js runtime version
    let runtimeVersion: string | undefined;
    let eol = false;

    if (manifest.engines?.node) {
      runtimeVersion = extractVersionFromRange(manifest.engines.node);
    }

    // Check if runtime version is EOL
    if (runtimeVersion) {
      const majorVersion = runtimeVersion.split('.')[0];
      eol = NODE_EOL_VERSIONS.includes(majorVersion as any);
    }

    return {
      components,
      runtime: 'node',
      runtimeVersion,
      eol,
    };
  } catch (error) {
    console.error('Failed to parse package.json:', error);
    return { components: [] };
  }
}

export function parseNvmrc(content: string): {
  runtime: string;
  runtimeVersion: string;
  eol?: boolean;
} {
  const version = content.trim().replace(/^v/, '');
  const majorVersion = version.split('.')[0];
  const eol = NODE_EOL_VERSIONS.includes(majorVersion as any);

  return {
    runtime: 'node',
    runtimeVersion: version,
    eol,
  };
}

export function parseNodeVersion(content: string): {
  runtime: string;
  runtimeVersion: string;
  eol?: boolean;
} {
  return parseNvmrc(content); // Same format
}

function cleanVersion(version: string): string {
  // Remove semver prefixes and ranges
  return version
    .replace(/^[\^~>=<]+/, '')
    .replace(/\s.*$/, '') // Remove everything after first space
    .trim();
}

// Mock function to generate latest versions - in a real implementation, 
// this would fetch from npm registry
function generateMockLatestVersion(packageName: string, currentVersion: string): string {
  const mockVersions: Record<string, string> = {
    'react': '18.2.0',
    'express': '4.19.2',
    'lodash': '4.17.21',
    'axios': '1.6.8',
    'typescript': '5.4.5',
    'webpack': '5.91.0',
    'jest': '29.7.0',
    '@types/node': '20.12.7',
    'eslint': '8.57.0',
    'prettier': '3.2.5',
    'next': '14.2.1',
    'react-dom': '18.2.0',
    'tailwindcss': '3.4.3'
  };
  
  // Return mock version if available
  if (mockVersions[packageName]) {
    return mockVersions[packageName];
  }
  
  // Simple version increment logic for demo
  const versionParts = currentVersion.split('.');
  if (versionParts.length >= 3) {
    const patch = parseInt(versionParts[2]) || 0;
    versionParts[2] = (patch + Math.floor(Math.random() * 5) + 1).toString();
    return versionParts.join('.');
  }
  
  return currentVersion;
}

function extractVersionFromRange(range: string): string {
  // Extract a concrete version from a semver range
  // This is a simplified implementation
  const match = range.match(/(\d+(?:\.\d+)?(?:\.\d+)?)/);
  return match ? match[1] : range;
}
