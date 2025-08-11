# GitHub Repository Auto-Connection Setup

## Problem Fixed
Previously, GitHub repositories were not being automatically connected when users signed in via GitHub OAuth. This was due to authentication system mismatches between NextAuth.js and Clerk.

## Changes Made

### 1. Updated NextAuth.js Configuration (`src/pages/api/auth/[...nextauth].ts`)
- Added proper scopes to GitHub provider (`read:user user:email repo`)
- Modified callbacks to store GitHub access tokens in the session
- Enhanced JWT and session callbacks to include GitHub tokens

### 2. Updated GitHub User Repos API (`src/pages/api/github/user-repos.ts`)
- Modified to use NextAuth.js sessions instead of Clerk
- Added proper session validation
- GitHub access token is now retrieved from NextAuth.js session

### 3. Updated UserGitHubRepos Component (`src/components/repos/UserGitHubRepos.tsx`)
- Replaced Clerk's `useUser` hook with NextAuth.js `useSession` hook
- Updated loading and authentication state checks
- Component now properly detects GitHub sign-in status

### 4. Updated App Provider (`src/pages/_app.tsx`)
- Replaced ClerkProvider with NextAuth.js SessionProvider
- Maintains session state across the application

## Setup Instructions

### 1. Create GitHub OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: CodeCare AI
   - **Homepage URL**: `http://localhost:3000` (or your domain)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the Client ID and generate a Client Secret

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in:

```bash
# Required for GitHub OAuth
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Optional: Other OAuth providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
# ... etc
```

### 3. Generate NextAuth Secret
Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

## How It Works Now

1. **User Signs In**: User clicks "Sign in with GitHub" on `/auth/signin`
2. **OAuth Flow**: NextAuth.js redirects to GitHub for authorization
3. **Token Storage**: GitHub access token is stored in the NextAuth.js session
4. **Automatic Fetch**: When `UserGitHubRepos` component loads, it detects the GitHub session
5. **Repository Display**: Component automatically fetches and displays user's repositories

## Benefits

- ✅ **Seamless Experience**: Repositories appear automatically after GitHub sign-in
- ✅ **No Manual Setup**: No need for users to manually connect GitHub
- ✅ **Secure**: Uses OAuth 2.0 standard with proper token management
- ✅ **Scalable**: Works with public and private repositories
- ✅ **Consistent**: Single authentication system (NextAuth.js) throughout the app

## Testing

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000/auth/signin`
3. Click "Continue with GitHub"
4. Authorize the application
5. Navigate to `/repos` page
6. Your GitHub repositories should appear automatically

## Troubleshooting

### Repositories Not Showing
- Check if GitHub OAuth app is configured correctly
- Verify environment variables are set in `.env.local`
- Ensure callback URL matches exactly in GitHub OAuth app settings
- Check browser console for any API errors

### Authentication Errors
- Make sure `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your domain
- Check GitHub OAuth app credentials

### Development vs Production
- For production, update GitHub OAuth app with production URLs
- Set `NEXTAUTH_URL` to your production domain
- Use different OAuth app credentials for staging/production environments
