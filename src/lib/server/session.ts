// Demo session store for PATs - TODO: Replace with real session management + KMS
// In production, use secure session storage and encrypt PATs with proper key management

interface SessionData {
  pat: string;
  userId: string;
  createdAt: number;
}

// In-memory store for demo purposes
const sessionStore = new Map<string, SessionData>();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export function storeUserPAT(sessionId: string, pat: string, userId: string): void {
  // TODO: In production, encrypt PAT before storing
  sessionStore.set(sessionId, {
    pat,
    userId,
    createdAt: Date.now()
  });
}

export function getUserPAT(sessionId: string): string | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  // Check if session expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessionStore.delete(sessionId);
    return null;
  }

  return session.pat;
}

export function clearUserSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

export function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessionStore.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT) {
      sessionStore.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Every hour
