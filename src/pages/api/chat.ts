import type { NextApiRequest, NextApiResponse } from 'next';

interface ChatRequest {
  project?: string;
  message: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  context?: {
    libs?: Array<{
      name: string;
      currentVersion?: string;
      latestVersion?: string;
      type?: string;
    }>;
    security?: Array<{
      name: string;
      severity: string;
      count: number;
    }>;
    eolSoon?: Array<{
      name: string;
      eolDate: string;
    }>;
    compat?: {
      avg: number | null;
      min: number | null;
      notes?: string[];
    };
  };
}

interface ChatResponse {
  reply: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', reply: '' });
  }

  try {
    const { project, message, history, context }: ChatRequest = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ 
        error: 'Message is required', 
        reply: '' 
      });
    }

    // For now, return a mock response
    // In a real implementation, this would call an LLM API (OpenAI, Claude, etc.)
    let reply = generateMockResponse(message, context, project);

    res.status(200).json({ reply });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      reply: 'Sorry, I encountered an error while processing your request. Please try again.' 
    });
  }
}

function generateMockResponse(
  message: string, 
  context?: ChatRequest['context'], 
  project?: string
): string {
  const lowerMessage = message.toLowerCase();

  // Project-specific responses
  if (project) {
    if (lowerMessage.includes('dependencies') || lowerMessage.includes('library') || lowerMessage.includes('package')) {
      if (context?.libs && context.libs.length > 0) {
        const outdatedLibs = context.libs.filter(lib => 
          lib.currentVersion && lib.latestVersion && lib.currentVersion !== lib.latestVersion
        );
        
        if (outdatedLibs.length > 0) {
          return `I can see your project "${project}" has ${context.libs.length} dependencies. ${outdatedLibs.length} of them have newer versions available. The most notable ones are: ${outdatedLibs.slice(0, 3).map(lib => `${lib.name} (${lib.currentVersion} → ${lib.latestVersion})`).join(', ')}. Would you like me to help you prioritize which ones to update first?`;
        } else {
          return `Your project "${project}" has ${context.libs.length} dependencies, and they all appear to be up to date! This is great for security and performance.`;
        }
      }
      return `I'd be happy to help you analyze the dependencies in your "${project}" project. Could you run a scan first so I can see what libraries you're using?`;
    }

    if (lowerMessage.includes('security') || lowerMessage.includes('vulnerability') || lowerMessage.includes('cve')) {
      if (context?.security && context.security.length > 0) {
        const totalVulns = context.security.reduce((sum, item) => sum + item.count, 0);
        const highSeverity = context.security.filter(item => item.severity === 'high' || item.severity === 'critical');
        
        return `I found ${totalVulns} security vulnerabilities in your project "${project}". ${highSeverity.length > 0 ? `⚠️ ${highSeverity.length} are high or critical severity and should be addressed immediately.` : 'Most are low to medium severity.'} The affected libraries are: ${context.security.map(item => `${item.name} (${item.count} ${item.severity})`).join(', ')}. I recommend updating these libraries as soon as possible.`;
      }
      return `I can help you identify security vulnerabilities in your "${project}" project. Run a security scan to see if there are any known CVEs in your dependencies.`;
    }

    if (lowerMessage.includes('compatibility') || lowerMessage.includes('conflict') || lowerMessage.includes('version')) {
      if (context?.compat) {
        if (context.compat.avg !== null) {
          const avgScore = context.compat.avg;
          if (avgScore >= 85) {
            return `Great news! Your project "${project}" has excellent compatibility with an average score of ${avgScore}%. Your dependencies work well together.`;
          } else if (avgScore >= 70) {
            return `Your project "${project}" has decent compatibility (${avgScore}% average), but there might be some minor conflicts between dependencies. ${context.compat.notes?.length ? 'Key issues: ' + context.compat.notes.join(', ') : ''}`;
          } else {
            return `⚠️ Your project "${project}" shows compatibility concerns with a ${avgScore}% average score. This could lead to runtime issues or build problems. ${context.compat.notes?.length ? 'Main issues: ' + context.compat.notes.join(', ') : ''} I recommend reviewing your dependency versions.`;
          }
        }
      }
      return `I can help you analyze compatibility between dependencies in your "${project}" project. Would you like me to check for version conflicts?`;
    }

    if (lowerMessage.includes('eol') || lowerMessage.includes('end of life') || lowerMessage.includes('deprecated')) {
      if (context?.eolSoon && context.eolSoon.length > 0) {
        return `⚠️ I found ${context.eolSoon.length} dependencies in your "${project}" project that are approaching or past their end-of-life dates: ${context.eolSoon.map(item => `${item.name} (EOL: ${item.eolDate})`).join(', ')}. You should plan to migrate away from these libraries to maintain security and support.`;
      }
      return `I can check which dependencies in your "${project}" project are approaching end-of-life. This is important for long-term maintenance and security.`;
    }

    if (lowerMessage.includes('update') || lowerMessage.includes('upgrade')) {
      return `For your "${project}" project, I recommend creating a systematic update strategy:\n\n1. **Security First**: Update any libraries with known vulnerabilities\n2. **Major Versions**: Plan carefully for major version updates that might have breaking changes\n3. **Testing**: Always test updates in a staging environment first\n4. **Batch Updates**: Group related dependencies together\n\nWould you like me to help you prioritize which dependencies to update first?`;
    }
  }

  // General responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your CodeCare AI assistant. I can help you analyze dependencies, security vulnerabilities, compatibility issues, and provide upgrade recommendations for your projects. What would you like to know?";
  }

  if (lowerMessage.includes('help')) {
    return "I can help you with:\n\n📦 **Dependency Analysis** - Review your project's libraries and packages\n🔒 **Security Scanning** - Find vulnerabilities and CVEs\n🔄 **Compatibility Checking** - Identify version conflicts\n📅 **EOL Monitoring** - Track end-of-life dates\n⬆️ **Upgrade Planning** - Strategic update recommendations\n\nJust ask me about any of these topics!";
  }

  // Default response
  return "I'd be happy to help you with your project dependencies and security analysis. Could you tell me more about what you're looking for? I can assist with dependency analysis, security vulnerabilities, compatibility issues, or upgrade planning.";
}
