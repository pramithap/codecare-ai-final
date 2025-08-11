import type { Repository } from '../../types/repos';

// Simple in-memory store for demo - TODO: Replace with database
export const repos = new Map<string, Repository>();

// Repository store starts empty - repositories will be added by users
