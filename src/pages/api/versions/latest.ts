import type { NextApiRequest, NextApiResponse } from 'next';

interface LatestVersionRequest {
  packages: Array<{
    name: string;
    currentVersion: string;
    ecosystem: 'npm' | 'maven' | 'pypi';
  }>;
}

interface LatestVersionResponse {
  versions: Array<{
    name: string;
    currentVersion: string;
    latestVersion: string;
    hasUpdate: boolean;
  }>;
}

// Mock latest versions - in a real implementation, this would fetch from package registries
const MOCK_NPM_VERSIONS: Record<string, string> = {
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

const MOCK_MAVEN_VERSIONS: Record<string, string> = {
  'org.springframework:spring-core': '6.1.5',
  'org.springframework.boot:spring-boot-starter': '3.2.4',
  'junit:junit': '4.13.2',
  'org.junit.jupiter:junit-jupiter': '5.10.2',
  'com.fasterxml.jackson.core:jackson-core': '2.17.0',
  'org.apache.commons:commons-lang3': '3.14.0',
  'org.slf4j:slf4j-api': '2.0.12',
  'ch.qos.logback:logback-classic': '1.5.3',
  'org.hibernate:hibernate-core': '6.4.4.Final'
};

const MOCK_PYPI_VERSIONS: Record<string, string> = {
  'django': '5.0.4',
  'flask': '3.0.3',
  'fastapi': '0.110.1',
  'requests': '2.31.0',
  'numpy': '1.26.4',
  'pandas': '2.2.2',
  'pytest': '8.1.1'
};

function generateMockVersion(packageName: string, currentVersion: string, ecosystem: string): string {
  const mockVersions = ecosystem === 'npm' ? MOCK_NPM_VERSIONS : 
                      ecosystem === 'maven' ? MOCK_MAVEN_VERSIONS : 
                      MOCK_PYPI_VERSIONS;

  if (mockVersions[packageName]) {
    return mockVersions[packageName];
  }

  // Generate a slightly newer version
  const versionParts = currentVersion.replace(/[^0-9.]/g, '').split('.');
  if (versionParts.length >= 2) {
    const patch = parseInt(versionParts[versionParts.length - 1]) || 0;
    versionParts[versionParts.length - 1] = (patch + Math.floor(Math.random() * 5) + 1).toString();
    return versionParts.join('.');
  }

  return currentVersion;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LatestVersionResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { packages }: LatestVersionRequest = req.body;

    if (!packages || !Array.isArray(packages)) {
      return res.status(400).json({ error: 'Invalid request: packages array required' });
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const versions = packages.map(pkg => {
      const latestVersion = generateMockVersion(pkg.name, pkg.currentVersion, pkg.ecosystem);
      return {
        name: pkg.name,
        currentVersion: pkg.currentVersion,
        latestVersion,
        hasUpdate: latestVersion !== pkg.currentVersion
      };
    });

    res.status(200).json({ versions });
  } catch (error) {
    console.error('Latest versions API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
