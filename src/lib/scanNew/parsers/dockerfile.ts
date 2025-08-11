import type { ServiceComponent } from '../../../types/scanNew';

// Simple Dockerfile parser as fallback
function parseDockerfileContent(content: string): Array<{ name: string; args: string }> {
  const lines = content.split('\n');
  const instructions: Array<{ name: string; args: string }> = [];
  let currentInstruction: { name: string; args: string } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Handle line continuations (backslash at end)
    while (line.endsWith('\\') && i < lines.length - 1) {
      line = line.slice(0, -1).trim() + ' ' + lines[++i].trim();
    }
    
    const finalTrimmed = line.trim();
    const spaceIndex = finalTrimmed.indexOf(' ');
    
    if (spaceIndex === -1) {
      // Instruction without arguments
      if (finalTrimmed.toUpperCase() === finalTrimmed) {
        instructions.push({ name: finalTrimmed.toUpperCase(), args: '' });
      }
      continue;
    }
    
    const name = finalTrimmed.substring(0, spaceIndex).toUpperCase();
    const args = finalTrimmed.substring(spaceIndex + 1).trim();
    
    instructions.push({ name, args });
  }
  
  return instructions;
}

export function parseDockerfile(content: string): {
  components: ServiceComponent[];
  baseImage?: string;
  runtime?: string;
  runtimeVersion?: string;
} {
  try {
    // Use our reliable fallback parser
    const parsed = parseDockerfileContent(content);
    
    const components: ServiceComponent[] = [];
    let baseImage: string | undefined;
    let runtime: string | undefined;
    let runtimeVersion: string | undefined;

    // Find FROM instruction to get base image
    const fromInstruction = parsed.find((instruction: any) => 
      instruction.name?.toLowerCase() === 'from'
    );

    if (fromInstruction?.args) {
      baseImage = fromInstruction.args.trim();
      
      // Try to extract runtime info from base image
      const imageInfo = extractRuntimeFromImage(baseImage);
      runtime = imageInfo.runtime;
      runtimeVersion = imageInfo.version;

      // Add base image as a component
      components.push({
        name: baseImage.split(':')[0] || baseImage,
        version: baseImage.split(':')[1] || 'latest',
        type: 'dependency',
        scope: 'base-image',
        cveCount: 0,
      });
    }

    return {
      components,
      baseImage,
      runtime,
      runtimeVersion,
    };
  } catch (error) {
    console.error('Failed to parse Dockerfile:', error);
    
    // Fallback: simple regex parsing for FROM instruction
    const fromMatch = content.match(/^FROM\s+(.+)$/m);
    if (fromMatch) {
      const baseImage = fromMatch[1].trim();
      const imageInfo = extractRuntimeFromImage(baseImage);
      
      return {
        components: [{
          name: baseImage.split(':')[0] || baseImage,
          version: baseImage.split(':')[1] || 'latest',
          type: 'dependency',
          scope: 'base-image',
          cveCount: 0,
        }],
        baseImage,
        runtime: imageInfo.runtime,
        runtimeVersion: imageInfo.version,
      };
    }

    return { components: [] };
  }
}

function extractRuntimeFromImage(image: string): { runtime?: string; version?: string } {
  const [imageName, tag = 'latest'] = image.split(':');
  
  // Common runtime image patterns
  const runtimePatterns: Array<{ pattern: RegExp; runtime: string }> = [
    { pattern: /^node/, runtime: 'node' },
    { pattern: /^openjdk/, runtime: 'java' },
    { pattern: /^adoptopenjdk/, runtime: 'java' },
    { pattern: /^eclipse-temurin/, runtime: 'java' },
    { pattern: /^python/, runtime: 'python' },
    { pattern: /^ruby/, runtime: 'ruby' },
    { pattern: /^php/, runtime: 'php' },
    { pattern: /^golang/, runtime: 'go' },
    { pattern: /^nginx/, runtime: 'nginx' },
    { pattern: /^alpine/, runtime: 'alpine' },
    { pattern: /^ubuntu/, runtime: 'ubuntu' },
    { pattern: /^debian/, runtime: 'debian' },
  ];

  for (const { pattern, runtime } of runtimePatterns) {
    if (pattern.test(imageName.toLowerCase())) {
      // Try to extract version from tag
      const version = extractVersionFromTag(tag, runtime);
      return { runtime, version };
    }
  }

  return {};
}

function extractVersionFromTag(tag: string, runtime: string): string | undefined {
  // Remove common suffixes
  const cleanTag = tag
    .replace(/-alpine$/, '')
    .replace(/-slim$/, '')
    .replace(/-bullseye$/, '')
    .replace(/-buster$/, '');

  // Extract version patterns
  const versionPatterns = [
    /^(\d+\.\d+\.\d+)/, // x.y.z
    /^(\d+\.\d+)/, // x.y
    /^(\d+)/, // x
  ];

  for (const pattern of versionPatterns) {
    const match = cleanTag.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return cleanTag !== 'latest' ? cleanTag : undefined;
}
