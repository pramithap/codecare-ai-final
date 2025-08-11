// Manifest parsers for different package managers

export interface Dependency {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'optional';
}

export interface ParsedManifest {
  type: 'npm' | 'maven' | 'python' | 'ruby' | 'composer' | 'cargo' | 'nuget';
  dependencies: Dependency[];
  metadata: {
    name?: string;
    version?: string;
    description?: string;
  };
}

/**
 * Parse package.json for Node.js projects
 */
export function parsePackageJson(content: string): ParsedManifest {
  try {
    const parsed = JSON.parse(content);
    const dependencies: Dependency[] = [];

    // Production dependencies
    if (parsed.dependencies) {
      Object.entries(parsed.dependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: version as string,
          type: 'production'
        });
      });
    }

    // Development dependencies
    if (parsed.devDependencies) {
      Object.entries(parsed.devDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: version as string,
          type: 'development'
        });
      });
    }

    // Peer dependencies
    if (parsed.peerDependencies) {
      Object.entries(parsed.peerDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: version as string,
          type: 'peer'
        });
      });
    }

    return {
      type: 'npm',
      dependencies,
      metadata: {
        name: parsed.name,
        version: parsed.version,
        description: parsed.description
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse package.json: ${error}`);
  }
}

/**
 * Parse requirements.txt for Python projects
 */
export function parseRequirementsTxt(content: string): ParsedManifest {
  const dependencies: Dependency[] = [];
  const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

  lines.forEach(line => {
    const trimmed = line.trim();
    // Simple parsing - can be enhanced for more complex requirement formats
    const match = trimmed.match(/^([a-zA-Z0-9\-_.]+)([>=<~!]+)?(.+)?$/);
    if (match) {
      const [, name, operator, version] = match;
      dependencies.push({
        name,
        version: operator && version ? `${operator}${version}` : '*',
        type: 'production'
      });
    }
  });

  return {
    type: 'python',
    dependencies,
    metadata: {}
  };
}

/**
 * Parse pom.xml for Maven projects (basic implementation)
 */
export function parsePomXml(content: string): ParsedManifest {
  // This is a simplified parser - in production, you'd want to use a proper XML parser
  const dependencies: Dependency[] = [];
  
  // Extract dependencies using regex (not ideal for production)
  const dependencyPattern = /<dependency>[\s\S]*?<\/dependency>/g;
  const matches = content.match(dependencyPattern) || [];

  matches.forEach(depBlock => {
    const groupIdMatch = depBlock.match(/<groupId>(.*?)<\/groupId>/);
    const artifactIdMatch = depBlock.match(/<artifactId>(.*?)<\/artifactId>/);
    const versionMatch = depBlock.match(/<version>(.*?)<\/version>/);
    const scopeMatch = depBlock.match(/<scope>(.*?)<\/scope>/);

    if (groupIdMatch && artifactIdMatch) {
      const name = `${groupIdMatch[1]}:${artifactIdMatch[1]}`;
      const version = versionMatch ? versionMatch[1] : '*';
      const scope = scopeMatch ? scopeMatch[1] : 'production';
      
      dependencies.push({
        name,
        version,
        type: scope === 'test' ? 'development' : 'production'
      });
    }
  });

  return {
    type: 'maven',
    dependencies,
    metadata: {}
  };
}

/**
 * Parse Gemfile for Ruby projects
 */
export function parseGemfile(content: string): ParsedManifest {
  const dependencies: Dependency[] = [];
  const lines = content.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    // Match gem declarations: gem 'name', 'version'
    const match = trimmed.match(/^gem\s+['"]([^'"]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
    if (match) {
      const [, name, version] = match;
      dependencies.push({
        name,
        version: version || '*',
        type: 'production'
      });
    }
  });

  return {
    type: 'ruby',
    dependencies,
    metadata: {}
  };
}

/**
 * Auto-detect and parse manifest file based on filename
 */
export function parseManifest(filename: string, content: string): ParsedManifest {
  const lowercaseFilename = filename.toLowerCase();

  if (lowercaseFilename === 'package.json') {
    return parsePackageJson(content);
  } else if (lowercaseFilename === 'requirements.txt') {
    return parseRequirementsTxt(content);
  } else if (lowercaseFilename === 'pom.xml') {
    return parsePomXml(content);
  } else if (lowercaseFilename === 'gemfile') {
    return parseGemfile(content);
  } else {
    throw new Error(`Unsupported manifest file: ${filename}`);
  }
}
