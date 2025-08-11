<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# CodeCare AI - Dependency Upgrade Assistant

This is a Next.js TypeScript project for an AI-powered, multi-language dependency upgrade assistant.

## Project Structure

- `/src/pages` - Contains the main application pages using Pages Router
- `/src/components` - Reusable React components with TypeScript
- `/src/lib` - Utility libraries and helper functions
- `/src/pages/api` - API routes for backend functionality

## Key Technologies

- **Next.js 15** with both App Router and Pages Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React 19** for UI components

## Development Guidelines

1. **TypeScript**: All files should use TypeScript with proper type definitions
2. **Components**: Create reusable components with proper TypeScript interfaces
3. **API Routes**: Use Next.js API routes with proper TypeScript typing
4. **Styling**: Use Tailwind CSS classes for consistent styling
5. **Error Handling**: Implement proper error handling and user feedback
6. **Performance**: Consider caching strategies for API calls and data fetching

## API Integration

The project includes placeholder API routes for:
- Package scanning and parsing
- Version checking across multiple registries (NPM, Maven, PyPI)
- AI-powered compatibility analysis
- Upgrade plan generation
- Chat functionality

## Components Architecture

- `LibTable` - Displays dependency information in tabular format
- `Heatmap` - Visualizes compatibility matrix between packages
- `PlanStep` - Shows individual upgrade steps with status
- `ChatWindow` - AI chat interface for Q&A
- `SettingsForm` - Configuration and preferences management

## Future Implementation Notes

When implementing functionality:
1. Replace mock data with real API calls
2. Integrate with actual package registries
3. Connect to LLM services (OpenAI, Claude, etc.)
4. Add authentication and user management
5. Implement real-time updates and notifications
6. Add comprehensive error handling and logging
