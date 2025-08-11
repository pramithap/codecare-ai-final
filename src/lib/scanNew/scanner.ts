import path from 'path';
import type { ServiceSummary, ServiceComponent, RepoRef, ScanResults, TechnologySummary } from '../../types/scanNew';
import { scanStore } from './store';
import { GitHubPublicAPI } from './githubPublic';
import { parsePackageJson, parseNvmrc, parseNodeVersion } from './parsers/node';
import { parsePomXml } from './parsers/maven';
import { parseGradleBuild } from './parsers/gradle';
import { parseDockerfile } from './parsers/dockerfile';

export class ScanEngine {
  private githubApi: GitHubPublicAPI;

  constructor(accessToken?: string) {
    this.githubApi = new GitHubPublicAPI(accessToken);
    console.log(`Scanner initialized ${accessToken ? 'with authentication' : 'for public repositories (no authentication)'}`);
  }

  async runScan(runId: string): Promise<void> {
    console.log(`[Scanner] Starting scan for run: ${runId}`);
    const run = scanStore.getRun(runId);
    if (!run) {
      console.error(`[Scanner] Run ${runId} not found in store`);
      throw new Error(`Run ${runId} not found`);
    }

    console.log(`[Scanner] Found run with ${run.repos.length} repositories`);
    scanStore.updateRun(runId, { status: 'running' });

    const allServices: ServiceSummary[] = [];

    try {
      // Process each repository
      for (const repo of run.repos) {
        try {
          const services = await this.scanRepository(runId, repo, run.depth);
          allServices.push(...services);
          
          scanStore.updateProgress(runId, repo.id, {
            status: 'completed',
            progress: 100,
            message: `Found ${services.length} service(s)`,
          });
        } catch (error) {
          console.error(`Failed to scan repository ${repo.name}:`, error);
          
          let errorMessage = 'Scan failed';
          if (error instanceof Error) {
            errorMessage = error.message;
            
            // Provide helpful guidance for rate limit errors
            if (error.message.includes('rate limit')) {
              errorMessage = 'GitHub API rate limit exceeded. Please sign in with GitHub for higher rate limits, or try again later.';
            } else if (error.message.includes('Bad credentials') || error.message.includes('authentication')) {
              errorMessage = 'Authentication required. Please sign in with GitHub to access repositories.';
            }
          }
          
          scanStore.updateProgress(runId, repo.id, {
            status: 'failed',
            progress: 0,
            message: errorMessage,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Create results summary
      const technologies = this.generateTechnologySummary(allServices);
      
      const results: ScanResults = {
        runId,
        services: allServices,
        totalServices: allServices.length,
        totalComponents: allServices.reduce((sum, svc) => sum + svc.components.length, 0),
        flaggedComponents: allServices.reduce((sum, svc) => 
          sum + svc.components.filter(c => c.flagged).length, 0),
        eolComponents: allServices.reduce((sum, svc) => 
          sum + svc.components.filter(c => c.eol).length, 0),
        technologies,
      };

      scanStore.setResults(runId, results);
      
    } catch (error) {
      console.error(`Scan ${runId} failed:`, error);
      scanStore.updateRun(runId, { status: 'failed', endTime: new Date().toISOString() });
      throw error;
    }
  }

  private async scanRepository(
    runId: string, 
    repo: RepoRef, 
    depth: 'full' | 'incremental'
  ): Promise<ServiceSummary[]> {
    
    if (repo.provider === 'github') {
      return this.scanGitHubRepository(runId, repo, depth);
    } else if (repo.provider === 'zip') {
      return this.scanZipRepository(runId, repo);
    }

    return [];
  }

  private async scanGitHubRepository(
    runId: string,
    repo: RepoRef,
    depth: 'full' | 'incremental'
  ): Promise<ServiceSummary[]> {
    if (!repo.remoteUrl) {
      throw new Error('GitHub repository URL is required');
    }

    const repoInfo = GitHubPublicAPI.parseRepoUrl(repo.remoteUrl);
    if (!repoInfo) {
      throw new Error(`Invalid GitHub URL: ${repo.remoteUrl}`);
    }

    const { owner, repo: repoName } = repoInfo;

    // Progress: 5% - Resolving branch & tree
    scanStore.updateProgress(runId, repo.id, {
      progress: 5,
      message: 'Resolving branch & tree',
    });

    // Get branch info
    const branch = await this.githubApi.getBranch(owner, repoName, repo.defaultBranch);
    const commitSha = branch.commit.sha;

    // Check incremental scan conditions
    const repoCache = scanStore.getRepoCache(repo.id);
    let manifestsToFetch: Array<{ path: string; sha: string }> = [];

    if (depth === 'incremental' && repoCache.lastCommitSha) {
      // Use comparison API to get changed files
      try {
        const comparison = await this.githubApi.compareCommits(
          owner, 
          repoName, 
          repoCache.lastCommitSha, 
          commitSha
        );

        if (comparison.files && comparison.files.length > 0) {
          // Filter changed files to manifest patterns
          const changedManifests = comparison.files
            .filter((file: any) => 
              file.status !== 'removed' && 
              this.githubApi.isManifestFile(file.filename)
            );

          // Get tree to find blob SHAs for changed manifests
          const tree = await this.githubApi.getTree(owner, repoName, commitSha, true);
          
          manifestsToFetch = tree.tree
            .filter((item: any) => 
              item.type === 'blob' && 
              changedManifests.some((changed: any) => changed.filename === item.path)
            )
            .map((item: any) => ({ path: item.path, sha: item.sha }));

        } else {
          // No changes, return empty results
          return [];
        }
      } catch (error) {
        console.warn('Incremental scan failed, falling back to full scan:', error);
        depth = 'full';
      }
    }

    if (depth === 'full' || manifestsToFetch.length === 0) {
      // Full scan: get complete tree
      const tree = await this.githubApi.getTree(owner, repoName, commitSha, true);
      const manifestFiles = this.githubApi.findManifestFiles(tree);
      
      manifestsToFetch = manifestFiles.map((item: any) => ({ 
        path: item.path, 
        sha: item.sha 
      }));
    }

    // Progress: 25% - Indexing manifests
    scanStore.updateProgress(runId, repo.id, {
      progress: 25,
      message: `Indexing manifests (${manifestsToFetch.length} found)`,
    });

    if (manifestsToFetch.length === 0) {
      return [];
    }

    // Progress: 60% - Fetching blobs
    scanStore.updateProgress(runId, repo.id, {
      progress: 60,
      message: `Fetching blobs (0/${manifestsToFetch.length})`,
    });

    // Fetch manifest contents
    const manifestContents = await this.githubApi.getMultipleBlobs(
      owner,
      repoName,
      manifestsToFetch.map(m => ({ path: m.path, sha: m.sha })),
      repo.defaultBranch,
      (completed: number, total: number) => {
        const progressPercent = Math.floor(60 + (completed / total) * 25);
        scanStore.updateProgress(runId, repo.id, {
          progress: progressPercent,
          message: `Fetching blobs (${completed}/${total})`,
        });
      }
    );

    // Progress: 85% - Parsing manifests
    scanStore.updateProgress(runId, repo.id, {
      progress: 85,
      message: 'Parsing manifests',
    });

    // Parse manifests and group by directory
    const services = this.groupManifestsIntoServices(manifestContents, repo.name);

    // Update cache
    scanStore.updateRepoCache(repo.id, {
      lastCommitSha: commitSha,
      manifestIndex: new Set(manifestsToFetch.map(m => m.path)),
    });

    return services;
  }

  private async scanZipRepository(runId: string, repo: RepoRef): Promise<ServiceSummary[]> {
    // For ZIP repositories, we would read from the uploaded file/S3
    // This is a placeholder implementation
    scanStore.updateProgress(runId, repo.id, {
      progress: 50,
      message: 'Reading ZIP contents',
    });

    // TODO: Implement ZIP scanning using the uploaded file
    // This would involve reading the ZIP file and extracting manifest files
    
    return [];
  }

  private groupManifestsIntoServices(
    manifestContents: Array<{ path: string; content: string; error?: string }>,
    repoName: string
  ): ServiceSummary[] {
    const serviceMap = new Map<string, {
      path: string;
      manifestFiles: string[];
      components: ServiceComponent[];
      runtime?: string;
      runtimeVersion?: string;
      eol?: boolean;
      baseImage?: string;
    }>();

    // Group manifests by directory
    for (const manifest of manifestContents) {
      if (manifest.error || !manifest.content) {
        console.warn(`Skipping manifest ${manifest.path}: ${manifest.error}`);
        continue;
      }

      const dirPath = path.dirname(manifest.path);
      const fileName = path.basename(manifest.path);

      if (!serviceMap.has(dirPath)) {
        serviceMap.set(dirPath, {
          path: dirPath,
          manifestFiles: [],
          components: [],
        });
      }

      const service = serviceMap.get(dirPath)!;
      service.manifestFiles.push(fileName);

      // Parse based on file type
      try {
        const parseResult = this.parseManifestFile(fileName, manifest.content);
        
        if ('components' in parseResult && parseResult.components) {
          service.components.push(...parseResult.components);
        }

        if ('runtime' in parseResult && parseResult.runtime) {
          service.runtime = parseResult.runtime;
        }

        if ('runtimeVersion' in parseResult && parseResult.runtimeVersion) {
          service.runtimeVersion = parseResult.runtimeVersion;
        }

        if ('eol' in parseResult && parseResult.eol) {
          service.eol = parseResult.eol;
        }

        if ('baseImage' in parseResult && parseResult.baseImage) {
          service.baseImage = parseResult.baseImage;
        }

      } catch (error) {
        console.error(`Failed to parse ${manifest.path}:`, error);
      }
    }

    // Convert to ServiceSummary array
    const services: ServiceSummary[] = [];
    
    for (const [dirPath, serviceData] of serviceMap) {
      const serviceName = dirPath === '.' ? repoName : path.basename(dirPath);
      
      services.push({
        id: `${repoName}-${dirPath}`.replace(/[^a-zA-Z0-9-_]/g, '-'),
        name: serviceName,
        path: dirPath,
        language: this.inferLanguage(serviceData.manifestFiles),
        runtime: serviceData.runtime,
        runtimeVersion: serviceData.runtimeVersion,
        components: serviceData.components,
        manifestFiles: serviceData.manifestFiles,
        eol: serviceData.eol,
        baseImage: serviceData.baseImage,
      });
    }

    return services;
  }

  private parseManifestFile(fileName: string, content: string) {
    switch (fileName) {
      case 'package.json':
        return parsePackageJson(content);
      
      case 'pom.xml':
        return parsePomXml(content);
      
      case 'build.gradle':
      case 'build.gradle.kts':
        return parseGradleBuild(content);
      
      case 'Dockerfile':
        return parseDockerfile(content);
      
      case '.nvmrc':
        return parseNvmrc(content);
      
      case '.node-version':
        return parseNodeVersion(content);
      
      case '.java-version':
        return {
          runtime: 'java',
          runtimeVersion: content.trim(),
        };
      
      default:
        return { components: [] };
    }
  }

  private inferLanguage(manifestFiles: string[]): string {
    if (manifestFiles.includes('package.json')) return 'javascript';
    if (manifestFiles.includes('pom.xml')) return 'java';
    if (manifestFiles.includes('build.gradle') || manifestFiles.includes('build.gradle.kts')) return 'java';
    if (manifestFiles.includes('build.xml')) return 'java';
    if (manifestFiles.includes('cpanfile') || manifestFiles.includes('Makefile.PL')) return 'perl';
    if (manifestFiles.includes('Dockerfile')) return 'docker';
    
    return 'unknown';
  }

  private generateTechnologySummary(services: ServiceSummary[]): TechnologySummary[] {
    const techMap = new Map<string, TechnologySummary>();

    for (const service of services) {
      // Add language
      if (service.language && service.language !== 'unknown') {
        const key = `lang-${service.language}`;
        if (!techMap.has(key)) {
          techMap.set(key, {
            name: this.formatTechnologyName(service.language),
            category: 'language',
            serviceCount: 0,
            services: []
          });
        }
        const tech = techMap.get(key)!;
        tech.serviceCount++;
        tech.services.push(service.name);
      }

      // Add runtime
      if (service.runtime) {
        const key = `runtime-${service.runtime}`;
        if (!techMap.has(key)) {
          techMap.set(key, {
            name: service.runtime,
            category: 'runtime',
            version: service.runtimeVersion,
            serviceCount: 0,
            services: []
          });
        }
        const tech = techMap.get(key)!;
        tech.serviceCount++;
        tech.services.push(service.name);
      }

      // Add base image (from Docker)
      if (service.baseImage) {
        const key = `container-${service.baseImage}`;
        if (!techMap.has(key)) {
          techMap.set(key, {
            name: service.baseImage,
            category: 'container',
            serviceCount: 0,
            services: []
          });
        }
        const tech = techMap.get(key)!;
        tech.serviceCount++;
        tech.services.push(service.name);
      }

      // Add frameworks and databases from components
      for (const component of service.components) {
        const category = this.categorizeComponent(component.name);
        if (category !== 'language') {
          const key = `${category}-${component.name}`;
          if (!techMap.has(key)) {
            techMap.set(key, {
              name: component.name,
              category,
              version: component.version,
              serviceCount: 0,
              services: []
            });
          }
          const tech = techMap.get(key)!;
          if (!tech.services.includes(service.name)) {
            tech.serviceCount++;
            tech.services.push(service.name);
          }
        }
      }
    }

    return Array.from(techMap.values())
      .sort((a, b) => b.serviceCount - a.serviceCount);
  }

  private formatTechnologyName(language: string): string {
    switch (language.toLowerCase()) {
      case 'javascript': return 'JavaScript/Node.js';
      case 'java': return 'Java';
      case 'python': return 'Python';
      case 'perl': return 'Perl';
      case 'docker': return 'Docker';
      default: return language.charAt(0).toUpperCase() + language.slice(1);
    }
  }

  private categorizeComponent(componentName: string): TechnologySummary['category'] {
    const name = componentName.toLowerCase();
    
    // Languages
    const languages = [
      'javascript', 'typescript', 'java', 'python', 'php', 'ruby', 'go', 
      'rust', 'kotlin', 'scala', 'csharp', 'cpp', 'c', 'swift', 'dart'
    ];
    
    // Frameworks
    const frameworks = [
      'express', 'react', 'angular', 'vue', 'svelte', 'next', 'nuxt',
      'spring', 'spring-boot', 'hibernate', 'struts',
      'django', 'flask', 'fastapi', 'tornado',
      'rails', 'laravel', 'symfony', 'codeigniter',
      'gin', 'echo', 'fiber', 'beego',
      'actix', 'rocket', 'warp',
      '.net', 'asp.net', 'entity-framework'
    ];
    
    // Databases
    const databases = [
      'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite',
      'oracle', 'sqlserver', 'mariadb', 'cassandra', 'elasticsearch',
      'dynamodb', 'neo4j', 'couchdb', 'influxdb', 'clickhouse'
    ];

    // Runtimes
    const runtimes = [
      'node', 'nodejs', 'openjdk', 'python', 'ruby', 'php', 'go', 'rust',
      'dotnet', 'jvm', 'v8', 'deno', 'bun'
    ];

    // Build Tools
    const buildTools = [
      'maven', 'gradle', 'webpack', 'vite', 'rollup', 'parcel', 'esbuild',
      'gulp', 'grunt', 'npm', 'yarn', 'pnpm', 'pip', 'poetry', 'pipenv',
      'composer', 'bundle', 'cargo', 'go-mod'
    ];

    // Testing
    const testing = [
      'jest', 'mocha', 'chai', 'jasmine', 'karma', 'cypress', 'playwright',
      'selenium', 'junit', 'testng', 'mockito', 'pytest', 'unittest',
      'rspec', 'minitest', 'phpunit', 'go-test'
    ];

    // Container/Infrastructure
    const containers = [
      'docker', 'kubernetes', 'k8s', 'helm', 'istio', 'envoy', 'nginx',
      'apache', 'tomcat', 'jetty', 'undertow', 'gunicorn', 'uvicorn'
    ];

    // Cloud Services
    const cloud = [
      'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify', 'digitalocean',
      's3', 'ec2', 'lambda', 'cloudformation', 'terraform', 'ansible'
    ];

    // Monitoring
    const monitoring = [
      'prometheus', 'grafana', 'elk', 'kibana', 'logstash', 'splunk',
      'datadog', 'newrelic', 'sentry', 'jaeger', 'zipkin'
    ];

    // Security
    const security = [
      'oauth', 'jwt', 'passport', 'auth0', 'okta', 'keycloak',
      'ssl', 'tls', 'vault', 'secrets'
    ];

    if (languages.some(lang => name.includes(lang))) return 'language';
    if (frameworks.some(fw => name.includes(fw))) return 'framework';
    if (databases.some(db => name.includes(db))) return 'database';
    if (runtimes.some(rt => name.includes(rt))) return 'runtime';
    if (buildTools.some(bt => name.includes(bt))) return 'build-tool';
    if (testing.some(t => name.includes(t))) return 'testing';
    if (containers.some(c => name.includes(c))) return 'container';
    if (cloud.some(c => name.includes(c))) return 'cloud';
    if (monitoring.some(m => name.includes(m))) return 'monitoring';
    if (security.some(s => name.includes(s))) return 'security';
    
    return 'other';
  }
}
