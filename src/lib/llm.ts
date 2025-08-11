// OpenAI and LLM wrapper functions

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CompatibilityAnalysis {
  compatible: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  recommendations: string[];
  warnings: string[];
}

export interface UpgradeRecommendation {
  package: string;
  currentVersion: string;
  recommendedVersion: string;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  breakingChanges: string[];
  testingRecommendations: string[];
}

/**
 * OpenAI Client wrapper
 */
export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Send a chat completion request
   */
  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.config.baseURL || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: this.config.maxTokens || 2000,
          temperature: this.config.temperature || 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      throw new Error(`Failed to call LLM API: ${error}`);
    }
  }

  /**
   * Analyze compatibility between packages
   */
  async analyzeCompatibility(
    package1: { name: string; version: string },
    package2: { name: string; version: string },
    context?: string
  ): Promise<CompatibilityAnalysis> {
    const systemPrompt = `You are a software dependency expert. Analyze the compatibility between two packages and provide a structured assessment.

Response format should be JSON with:
- compatible: boolean
- riskLevel: 'low' | 'medium' | 'high'
- reasoning: string explaining the assessment
- recommendations: array of strings with actionable advice
- warnings: array of strings with potential issues`;

    const userPrompt = `Analyze compatibility between:
Package 1: ${package1.name} version ${package1.version}
Package 2: ${package2.name} version ${package2.version}
${context ? `Context: ${context}` : ''}

Please provide a compatibility analysis in the specified JSON format.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        compatible: true,
        riskLevel: 'medium',
        reasoning: 'Unable to parse LLM response, defaulting to medium risk',
        recommendations: ['Manual verification recommended'],
        warnings: ['LLM analysis failed']
      };
    }
  }

  /**
   * Generate upgrade recommendations
   */
  async generateUpgradeRecommendation(
    packageName: string,
    currentVersion: string,
    availableVersions: string[],
    dependencies?: string[]
  ): Promise<UpgradeRecommendation> {
    const systemPrompt = `You are a software upgrade consultant. Provide detailed upgrade recommendations for packages.

Response format should be JSON with:
- package: string
- currentVersion: string
- recommendedVersion: string
- reasoning: string explaining why this version is recommended
- riskLevel: 'low' | 'medium' | 'high'
- estimatedEffort: string (e.g., "2-4 hours", "1 day", "1 week")
- breakingChanges: array of strings describing potential breaking changes
- testingRecommendations: array of strings with testing advice`;

    const userPrompt = `Package: ${packageName}
Current version: ${currentVersion}
Available versions: ${availableVersions.join(', ')}
${dependencies ? `Existing dependencies: ${dependencies.join(', ')}` : ''}

Please recommend the best version to upgrade to and provide analysis in the specified JSON format.`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback if JSON parsing fails
      const latestVersion = availableVersions[availableVersions.length - 1] || currentVersion;
      return {
        package: packageName,
        currentVersion,
        recommendedVersion: latestVersion,
        reasoning: 'Unable to parse LLM response, defaulting to latest version',
        riskLevel: 'medium',
        estimatedEffort: 'Unknown',
        breakingChanges: ['Unknown - manual review required'],
        testingRecommendations: ['Full regression testing recommended']
      };
    }
  }

  /**
   * Answer general questions about dependencies
   */
  async answerQuestion(question: string, context?: string): Promise<string> {
    const systemPrompt = `You are a helpful assistant specializing in software dependencies, package management, and version upgrades. 
Provide accurate, practical advice based on best practices in software development.
Keep responses concise but informative.`;

    const userPrompt = `${question}${context ? `\n\nContext: ${context}` : ''}`;

    const response = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    return response.content;
  }
}

/**
 * Factory function to create LLM client with default configuration
 */
export function createLLMClient(apiKey: string, model: string = 'gpt-4'): LLMClient {
  return new LLMClient({
    apiKey,
    model,
    maxTokens: 2000,
    temperature: 0.7
  });
}

/**
 * Mock LLM client for development/testing
 */
export class MockLLMClient extends LLMClient {
  constructor() {
    super({ apiKey: 'mock', model: 'mock' });
  }

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      content: `Mock response for: ${messages[messages.length - 1].content.substring(0, 50)}...`,
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      }
    };
  }

  async analyzeCompatibility(): Promise<CompatibilityAnalysis> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      compatible: true,
      riskLevel: 'low',
      reasoning: 'Mock analysis - packages appear compatible',
      recommendations: ['Run tests after upgrade', 'Review changelog'],
      warnings: []
    };
  }

  async generateUpgradeRecommendation(
    packageName: string,
    currentVersion: string,
    availableVersions: string[]
  ): Promise<UpgradeRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const recommendedVersion = availableVersions[availableVersions.length - 1] || currentVersion;
    
    return {
      package: packageName,
      currentVersion,
      recommendedVersion,
      reasoning: 'Mock recommendation - latest stable version',
      riskLevel: 'low',
      estimatedEffort: '2-4 hours',
      breakingChanges: ['No major breaking changes expected'],
      testingRecommendations: ['Run unit tests', 'Verify API compatibility']
    };
  }

  async answerQuestion(question: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return `Mock answer for: "${question}". This is a simulated response from the AI assistant. In a real implementation, this would provide detailed guidance about dependencies and upgrades.`;
  }
}
