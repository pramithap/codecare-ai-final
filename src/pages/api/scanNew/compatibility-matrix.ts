import type { NextApiRequest, NextApiResponse } from 'next';
import type { ServiceComponent } from '../../../types/scanNew';

interface CompatibilityMatrixRequest {
  components: ServiceComponent[];
  serviceInfo: {
    name: string;
    language: string;
    runtime?: string;
    runtimeVersion?: string;
  };
}

interface CompatibilityIssue {
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

interface CompatibilityMatrixEntry {
  component1: string;
  component2: string;
  compatible: boolean;
  issues?: CompatibilityIssue[];
  confidence: number; // 0-100
}

interface CompatibilityMatrixResponse {
  matrix: CompatibilityMatrixEntry[];
  summary: {
    totalPairs: number;
    compatiblePairs: number;
    incompatiblePairs: number;
    highRiskPairs: number;
  };
  recommendations: string[];
}

// Mock LLM response for now - replace with actual LLM integration
async function generateCompatibilityMatrix(
  components: ServiceComponent[],
  serviceInfo: CompatibilityMatrixRequest['serviceInfo']
): Promise<CompatibilityMatrixResponse> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const matrix: CompatibilityMatrixEntry[] = [];
  let compatibleCount = 0;
  let highRiskCount = 0;

  // Generate pairwise compatibility analysis
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const comp1 = components[i];
      const comp2 = components[j];
      
      // Simulate compatibility analysis logic
      const isCompatible = simulateCompatibility(comp1, comp2, serviceInfo);
      const issues = isCompatible ? [] : generateMockIssues(comp1, comp2);
      const severity = issues.find(issue => issue.severity === 'high') ? 'high' : 
                     issues.find(issue => issue.severity === 'medium') ? 'medium' : 'low';
      
      if (isCompatible) compatibleCount++;
      if (severity === 'high') highRiskCount++;

      matrix.push({
        component1: `${comp1.name}@${comp1.version}`,
        component2: `${comp2.name}@${comp2.version}`,
        compatible: isCompatible,
        issues: issues.length > 0 ? issues : undefined,
        confidence: Math.floor(Math.random() * 30) + 70 // 70-100
      });
    }
  }

  const totalPairs = matrix.length;
  
  return {
    matrix,
    summary: {
      totalPairs,
      compatiblePairs: compatibleCount,
      incompatiblePairs: totalPairs - compatibleCount,
      highRiskPairs: highRiskCount
    },
    recommendations: generateRecommendations(components, serviceInfo, matrix)
  };
}

function simulateCompatibility(
  comp1: ServiceComponent, 
  comp2: ServiceComponent, 
  serviceInfo: CompatibilityMatrixRequest['serviceInfo']
): boolean {
  // Mock compatibility logic based on common incompatibility patterns
  
  // Duplicate dependency check
  if (comp1.name === comp2.name) {
    const v1Major = parseInt(comp1.version.split('.')[0]);
    const v2Major = parseInt(comp2.version.split('.')[0]);
    return Math.abs(v1Major - v2Major) <= 1;
  }

  // Framework conflicts (known incompatible pairs)
  const incompatiblePairs = [
    ['react', 'angular'], ['react', 'vue'], ['angular', 'vue'],
    ['express', 'fastify'], ['express', 'koa'],
    ['webpack', 'vite'], ['webpack', 'rollup'],
    ['jest', 'mocha'], ['jest', 'vitest'],
    ['lodash', 'underscore'],
    ['moment', 'dayjs'], // moment is EOL, should conflict
    ['axios', 'fetch'], // not really incompatible but different approaches
  ];

  const isIncompatiblePair = incompatiblePairs.some(([a, b]) => 
    (comp1.name.toLowerCase().includes(a) && comp2.name.toLowerCase().includes(b)) ||
    (comp1.name.toLowerCase().includes(b) && comp2.name.toLowerCase().includes(a))
  );

  if (isIncompatiblePair) return false;

  // Version compatibility patterns
  const checkVersionCompatibility = (name1: string, version1: string, name2: string, version2: string) => {
    // React ecosystem compatibility
    if (name1.includes('react') && name2.includes('react')) {
      const v1Major = parseInt(version1.split('.')[0]);
      const v2Major = parseInt(version2.split('.')[0]);
      return v1Major === v2Major; // Same major version for React components
    }

    // Node.js version compatibility
    if ((name1.includes('node') || name1.includes('npm')) && name2.includes('node')) {
      const v1Major = parseInt(version1.split('.')[0]);
      const v2Major = parseInt(version2.split('.')[0]);
      return Math.abs(v1Major - v2Major) <= 2; // Node versions within 2 majors
    }

    return true;
  };

  if (!checkVersionCompatibility(comp1.name, comp1.version, comp2.name, comp2.version)) {
    return false;
  }

  // Language/runtime specific compatibility
  if (serviceInfo.language === 'javascript' || serviceInfo.language === 'typescript') {
    // ES module vs CommonJS conflicts
    const esmPackages = ['vite', 'vitest', 'vue', 'nuxt'];
    const cjsPackages = ['webpack', 'jest', 'express'];
    
    const comp1IsESM = esmPackages.some(pkg => comp1.name.includes(pkg));
    const comp2IsCJS = cjsPackages.some(pkg => comp2.name.includes(pkg));
    
    if (comp1IsESM && comp2IsCJS) return Math.random() > 0.3; // 70% chance of conflict
  }

  // EOL components have higher incompatibility
  if (comp1.eol && comp2.eol) {
    return Math.random() > 0.5; // 50% chance of incompatibility
  }

  if (comp1.eol || comp2.eol) {
    return Math.random() > 0.3; // 70% chance of compatibility
  }

  // CVE components are more likely to have issues
  const totalCVEs = comp1.cveCount + comp2.cveCount;
  if (totalCVEs > 5) {
    return Math.random() > 0.4; // 60% chance of incompatibility
  }

  if (totalCVEs > 0) {
    return Math.random() > 0.2; // 80% chance of compatibility
  }

  // Development vs production dependency mixing
  if (comp1.type !== comp2.type) {
    // Dev and prod dependencies can sometimes conflict
    if ((comp1.type === 'devDependency' && comp2.type === 'dependency') ||
        (comp1.type === 'dependency' && comp2.type === 'devDependency')) {
      return Math.random() > 0.15; // 85% chance of compatibility
    }
  }

  // Default compatibility for normal packages
  return Math.random() > 0.1; // 90% chance of compatibility
}

function generateMockIssues(comp1: ServiceComponent, comp2: ServiceComponent): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  // Duplicate package different versions
  if (comp1.name === comp2.name) {
    const severity = Math.abs(parseInt(comp1.version.split('.')[0]) - parseInt(comp2.version.split('.')[0])) > 1 ? 'high' : 'medium';
    issues.push({
      severity,
      description: `Version conflict: ${comp1.name} has conflicting versions ${comp1.version} and ${comp2.version}`,
      recommendation: `Consolidate to single version ${comp1.latestVersion || comp2.latestVersion || 'latest'}`
    });
  }

  // Framework conflicts
  const frameworks = [
    { names: ['react', '@types/react'], framework: 'React' },
    { names: ['vue', '@vue/core'], framework: 'Vue' },
    { names: ['angular', '@angular/core'], framework: 'Angular' },
    { names: ['svelte'], framework: 'Svelte' }
  ];

  const comp1Framework = frameworks.find(f => f.names.some(name => comp1.name.toLowerCase().includes(name.toLowerCase())));
  const comp2Framework = frameworks.find(f => f.names.some(name => comp2.name.toLowerCase().includes(name.toLowerCase())));

  if (comp1Framework && comp2Framework && comp1Framework.framework !== comp2Framework.framework) {
    issues.push({
      severity: 'high',
      description: `Multiple frontend frameworks detected: ${comp1Framework.framework} (${comp1.name}) and ${comp2Framework.framework} (${comp2.name})`,
      recommendation: `Choose a single frontend framework architecture. Consider migrating to ${comp1Framework.framework} or ${comp2Framework.framework}`
    });
  }

  // Build tool conflicts
  const buildTools = [
    { names: ['webpack'], tool: 'Webpack' },
    { names: ['vite'], tool: 'Vite' },
    { names: ['rollup'], tool: 'Rollup' },
    { names: ['parcel'], tool: 'Parcel' }
  ];

  const comp1BuildTool = buildTools.find(t => t.names.some(name => comp1.name.toLowerCase().includes(name)));
  const comp2BuildTool = buildTools.find(t => t.names.some(name => comp2.name.toLowerCase().includes(name)));

  if (comp1BuildTool && comp2BuildTool && comp1BuildTool.tool !== comp2BuildTool.tool) {
    issues.push({
      severity: 'medium',
      description: `Multiple build tools detected: ${comp1BuildTool.tool} and ${comp2BuildTool.tool}`,
      recommendation: `Standardize on a single build tool for consistency and reduced bundle size`
    });
  }

  // Testing framework conflicts
  const testFrameworks = ['jest', 'mocha', 'vitest', 'cypress', 'playwright'];
  const comp1Test = testFrameworks.find(f => comp1.name.includes(f));
  const comp2Test = testFrameworks.find(f => comp2.name.includes(f));

  if (comp1Test && comp2Test && comp1Test !== comp2Test) {
    issues.push({
      severity: 'low',
      description: `Multiple testing frameworks: ${comp1Test} and ${comp2Test}`,
      recommendation: `Consider consolidating to a single testing framework for consistency`
    });
  }

  // EOL warnings
  if (comp1.eol) {
    issues.push({
      severity: 'high',
      description: `${comp1.name} is end-of-life and may cause compatibility issues with modern packages`,
      recommendation: `Replace ${comp1.name} with a maintained alternative or upgrade to supported version`
    });
  }

  if (comp2.eol) {
    issues.push({
      severity: 'high',
      description: `${comp2.name} is end-of-life and may cause compatibility issues with modern packages`,
      recommendation: `Replace ${comp2.name} with a maintained alternative or upgrade to supported version`
    });
  }

  // Security vulnerability warnings
  if (comp1.cveCount > 0) {
    const severity = comp1.cveCount > 3 ? 'high' : comp1.cveCount > 1 ? 'medium' : 'low';
    issues.push({
      severity,
      description: `${comp1.name} has ${comp1.cveCount} known security vulnerabilities that may affect compatibility`,
      recommendation: `Update ${comp1.name} to version ${comp1.latestVersion || 'latest'} to resolve security issues`
    });
  }

  if (comp2.cveCount > 0) {
    const severity = comp2.cveCount > 3 ? 'high' : comp2.cveCount > 1 ? 'medium' : 'low';
    issues.push({
      severity,
      description: `${comp2.name} has ${comp2.cveCount} known security vulnerabilities that may affect compatibility`,
      recommendation: `Update ${comp2.name} to version ${comp2.latestVersion || 'latest'} to resolve security issues`
    });
  }

  // Version mismatch patterns
  const checkMajorVersionGap = (name: string, version1: string, version2: string) => {
    try {
      const v1Major = parseInt(version1.split('.')[0]);
      const v2Major = parseInt(version2.split('.')[0]);
      const gap = Math.abs(v1Major - v2Major);
      
      if (gap > 2) {
        return {
          severity: 'medium' as const,
          description: `Large version gap between ${comp1.name}@${version1} and ${comp2.name}@${version2} (${gap} major versions apart)`,
          recommendation: `Consider updating both packages to compatible versions within the same major version range`
        };
      }
    } catch {
      // Invalid version format, skip
    }
    return null;
  };

  // Check for ecosystem compatibility
  const ecosystemPackages = {
    react: ['react-dom', 'react-router', '@types/react', 'react-scripts'],
    vue: ['vue-router', 'vuex', '@vue/cli'],
    angular: ['@angular/core', '@angular/common', '@angular/router'],
    express: ['express', 'body-parser', 'cors', 'helmet'],
    webpack: ['webpack-dev-server', 'webpack-cli', 'html-webpack-plugin']
  };

  for (const [ecosystem, packages] of Object.entries(ecosystemPackages)) {
    const comp1InEcosystem = packages.some(pkg => comp1.name.includes(pkg));
    const comp2InEcosystem = packages.some(pkg => comp2.name.includes(pkg));
    
    if (comp1InEcosystem && comp2InEcosystem) {
      const versionIssue = checkMajorVersionGap(ecosystem, comp1.version, comp2.version);
      if (versionIssue) {
        issues.push(versionIssue);
      }
    }
  }

  return issues;
}

function generateRecommendations(
  components: ServiceComponent[],
  serviceInfo: CompatibilityMatrixRequest['serviceInfo'],
  matrix: CompatibilityMatrixEntry[]
): string[] {
  const recommendations: string[] = [];

  // Count issues by severity
  const highRiskCount = matrix.filter(entry => 
    entry.issues?.some(issue => issue.severity === 'high')
  ).length;

  const eolCount = components.filter(comp => comp.eol).length;
  const cveCount = components.reduce((sum, comp) => sum + comp.cveCount, 0);

  // Priority recommendations
  if (highRiskCount > 0) {
    recommendations.push(`Address ${highRiskCount} high-risk compatibility issues immediately`);
  }

  if (eolCount > 0) {
    recommendations.push(`Replace ${eolCount} end-of-life components with maintained alternatives`);
  }

  if (cveCount > 0) {
    recommendations.push(`Update components with ${cveCount} known security vulnerabilities`);
  }

  // Language-specific recommendations
  if (serviceInfo.language === 'javascript') {
    recommendations.push('Consider using npm audit to identify additional security issues');
    recommendations.push('Use package-lock.json to ensure consistent dependency versions');
  }

  if (serviceInfo.language === 'python') {
    recommendations.push('Use requirements.txt with pinned versions for reproducible builds');
    recommendations.push('Consider using pipenv or poetry for better dependency management');
  }

  if (serviceInfo.language === 'java') {
    recommendations.push('Use dependency management tools like Maven or Gradle to handle conflicts');
    recommendations.push('Consider using dependency convergence plugin to detect version conflicts');
  }

  // General recommendations
  recommendations.push('Regularly update dependencies to their latest stable versions');
  recommendations.push('Implement automated security scanning in your CI/CD pipeline');
  recommendations.push('Monitor for new vulnerabilities in your dependency tree');

  return recommendations;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompatibilityMatrixResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { components, serviceInfo }: CompatibilityMatrixRequest = req.body;

    if (!components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ error: 'Components array is required' });
    }

    if (!serviceInfo || !serviceInfo.name || !serviceInfo.language) {
      return res.status(400).json({ error: 'Service info with name and language is required' });
    }

    const result = await generateCompatibilityMatrix(components, serviceInfo);
    res.status(200).json(result);
  } catch (error) {
    console.error('Compatibility matrix generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
