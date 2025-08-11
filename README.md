# CodeCare AI - Dependency Upgrade Assistant

An AI-powered, multi-language dependency upgrade assistant built with Next.js and TypeScript.

## Features

- **Multi-language Support**: Scan dependencies from various package managers:
  - npm (package.json)
  - Maven (pom.xml)
  - Gradle (build.gradle, gradle.properties)
  - CPAN (cpanfile)
  - Ant (build.xml)
  - ChemAxon (pom.xml with ChemAxon dependencies)

- **Multiple Input Methods**:
  - Upload ZIP files containing your project
  - Clone and scan Git repositories directly

- **Dependency Analysis**:
  - Current version detection
  - Vulnerability scanning (planned)
  - End-of-life date checking (planned)
  - AI-powered upgrade recommendations (planned)

## Prerequisites

Before running the application, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn**
- **Git** (required for repository scanning feature)
  - Windows: Download from [git-scm.com](https://git-scm.com/download/win)
  - macOS: Install via Homebrew `brew install git` or Xcode Command Line Tools
  - Linux: `sudo apt-get install git` (Ubuntu/Debian) or `sudo yum install git` (RHEL/CentOS)

## Getting Started

### 1. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env.local
```

**GitHub Repository Scanning**: 
- ✅ **Public repositories**: Work out of the box, no authentication required!
- ❌ **Private repositories**: Not supported in current version

**Optional Configuration**: You can still set up other API keys for enhanced features:
- `OPENAI_API_KEY` - For AI-powered upgrade recommendations  
- `OSS_INDEX_API_KEY` - For enhanced security scanning

**Note**: This version is optimized for scanning public repositories without any authentication requirements.

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

### 4. Open the Application

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Scanning a ZIP File

1. Click the "Upload ZIP" button or drag and drop a ZIP file
2. Select a ZIP file containing your project
3. The application will extract and scan for dependency files
4. View the discovered dependencies in the results table

### Scanning a Git Repository

1. Enter a Git repository URL in the input field
2. Click "Scan" 
3. The application will crawl the repository using GitHub API and scan for dependencies
4. View the discovered dependencies in the results table

**⚠️ Note**: Currently only GitHub repositories are supported. The scanning uses GitHub's API to crawl files without requiring Git installation.

## Supported File Types

| Package Manager | File Names |
|----------------|------------|
| npm | package.json |
| Maven | pom.xml |
| Gradle | build.gradle, gradle.properties |
| CPAN | cpanfile |
| Ant | build.xml |
| ChemAxon | pom.xml (with ChemAxon-specific dependencies) |

## API Endpoints

### POST /api/scan
Handles ZIP file uploads and extracts dependencies.

**Request**: Multipart form data with a ZIP file
**Response**: JSON with project name and discovered dependencies

### POST /api/scan-git
Handles Git repository scanning via GitHub API.

**Request**: JSON with `gitUrl` property
**Response**: JSON with project name and discovered dependencies

### POST /api/versions
Enriches dependency data with latest version information from package registries.

**Request**: JSON with `libs` array containing dependency objects
**Response**: JSON with enriched dependency data including latest versions, release dates, and EOL information

**Supported Registries:**
- **npm**: Uses npm registry API for Node.js packages
- **Maven/Gradle**: Uses Maven Central search API for Java packages  
- **CPAN**: Uses MetaCPAN API for Perl modules
- **Ant**: Limited support with known package versions
- **ChemAxon**: Limited support with hardcoded version data

## Troubleshooting

### GitHub API Rate Limits

If you encounter rate limit errors when scanning repositories:

1. **GitHub API Rate Limits**: The application uses GitHub's public API which has rate limits
2. **Solutions**:
   - Wait for the rate limit to reset (usually 1 hour)
   - For higher limits, consider implementing GitHub API authentication (not included in this demo)

### Common Issues

- **File Upload Fails**: Check file size (max 100MB) and ensure it's a valid ZIP file
- **Repository Not Found**: Ensure the repository is public and the URL is correct
- **Build Errors**: Run `npm install` to ensure all dependencies are installed

## Development

### Building for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
