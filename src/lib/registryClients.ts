// Registry clients for fetching package information

export interface PackageInfo {
  name: string;
  versions: string[];
  latestVersion: string;
  description?: string;
  publishedAt?: Date;
  license?: string;
  vulnerabilities?: VulnerabilityInfo[];
}

export interface VulnerabilityInfo {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedVersions: string[];
  patchedVersions: string[];
}

/**
 * NPM Registry Client
 */
export class NPMRegistryClient {
  private baseUrl = 'https://registry.npmjs.org';

  async getPackageInfo(packageName: string): Promise<PackageInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/${packageName}`);
      if (!response.ok) {
        throw new Error(`Package not found: ${packageName}`);
      }

      const data = await response.json();
      const versions = Object.keys(data.versions);
      const latestVersion = data['dist-tags'].latest;

      return {
        name: packageName,
        versions,
        latestVersion,
        description: data.description,
        publishedAt: new Date(data.time[latestVersion]),
        license: data.license,
        vulnerabilities: [] // Would be populated from security advisory API
      };
    } catch (error) {
      throw new Error(`Failed to fetch NPM package info: ${error}`);
    }
  }

  async searchPackages(query: string, limit = 20): Promise<PackageInfo[]> {
    try {
      const response = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data.objects.map((obj: any) => ({
        name: obj.package.name,
        versions: [],
        latestVersion: obj.package.version,
        description: obj.package.description,
        publishedAt: new Date(obj.package.date),
        license: obj.package.license
      }));
    } catch (error) {
      throw new Error(`Failed to search NPM packages: ${error}`);
    }
  }
}

/**
 * Maven Central Registry Client
 */
export class MavenRegistryClient {
  private baseUrl = 'https://search.maven.org/solrsearch/select';

  async getPackageInfo(groupId: string, artifactId: string): Promise<PackageInfo> {
    try {
      const query = `g:"${groupId}" AND a:"${artifactId}"`;
      const response = await fetch(`${this.baseUrl}?q=${encodeURIComponent(query)}&core=gav&rows=1&wt=json`);
      
      if (!response.ok) {
        throw new Error(`Package not found: ${groupId}:${artifactId}`);
      }

      const data = await response.json();
      if (data.response.numFound === 0) {
        throw new Error(`Package not found: ${groupId}:${artifactId}`);
      }

      const packageData = data.response.docs[0];
      const latestVersion = packageData.latestVersion || packageData.v;

      // Get all versions
      const versionsQuery = `g:"${groupId}" AND a:"${artifactId}"`;
      const versionsResponse = await fetch(`${this.baseUrl}?q=${encodeURIComponent(versionsQuery)}&core=gav&rows=100&wt=json`);
      const versionsData = await versionsResponse.json();
      const versions = versionsData.response.docs.map((doc: any) => doc.v);

      return {
        name: `${groupId}:${artifactId}`,
        versions,
        latestVersion,
        publishedAt: new Date(packageData.timestamp)
      };
    } catch (error) {
      throw new Error(`Failed to fetch Maven package info: ${error}`);
    }
  }

  async searchPackages(query: string, limit = 20): Promise<PackageInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}?q=${encodeURIComponent(query)}&rows=${limit}&wt=json`);
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      return data.response.docs.map((doc: any) => ({
        name: `${doc.g}:${doc.a}`,
        versions: [],
        latestVersion: doc.latestVersion || doc.v,
        publishedAt: new Date(doc.timestamp)
      }));
    } catch (error) {
      throw new Error(`Failed to search Maven packages: ${error}`);
    }
  }
}

/**
 * PyPI Registry Client
 */
export class PyPIRegistryClient {
  private baseUrl = 'https://pypi.org/pypi';

  async getPackageInfo(packageName: string): Promise<PackageInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/${packageName}/json`);
      if (!response.ok) {
        throw new Error(`Package not found: ${packageName}`);
      }

      const data = await response.json();
      const versions = Object.keys(data.releases);
      const latestVersion = data.info.version;

      return {
        name: packageName,
        versions,
        latestVersion,
        description: data.info.summary,
        license: data.info.license
      };
    } catch (error) {
      throw new Error(`Failed to fetch PyPI package info: ${error}`);
    }
  }

  async searchPackages(query: string, limit = 20): Promise<PackageInfo[]> {
    // PyPI doesn't have a simple search API, would need to use different approach
    // For now, return empty array
    return [];
  }
}

/**
 * Registry Client Factory
 */
export class RegistryClientFactory {
  static createClient(type: 'npm' | 'maven' | 'pypi') {
    switch (type) {
      case 'npm':
        return new NPMRegistryClient();
      case 'maven':
        return new MavenRegistryClient();
      case 'pypi':
        return new PyPIRegistryClient();
      default:
        throw new Error(`Unsupported registry type: ${type}`);
    }
  }
}

/**
 * Universal package lookup function
 */
export async function getPackageInfo(packageName: string, registryType: 'npm' | 'maven' | 'pypi'): Promise<PackageInfo> {
  const client = RegistryClientFactory.createClient(registryType);
  
  if (registryType === 'maven') {
    // Maven packages have groupId:artifactId format
    const [groupId, artifactId] = packageName.split(':');
    if (!groupId || !artifactId) {
      throw new Error('Maven packages must be in format groupId:artifactId');
    }
    return (client as MavenRegistryClient).getPackageInfo(groupId, artifactId);
  } else {
    return (client as NPMRegistryClient | PyPIRegistryClient).getPackageInfo(packageName);
  }
}
