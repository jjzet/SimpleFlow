# Contributing to SimpleFlow

## Branching Strategy

We follow a trunk-based development strategy with the following branch hierarchy:

### Main Branches

- `main` - Production branch, contains the latest stable release
- `dev` - Development branch, contains features ready for the next release

### Supporting Branches

- `feature/*` - New features (branch from `dev`, merge to `dev`)
- `bugfix/*` - Bug fixes (branch from `dev`, merge to `dev`)
- `hotfix/*` - Critical fixes (branch from `main`, merge to both `main` and `dev`)
- `release/*` - Release preparation (branch from `dev`, merge to `main` and `dev`)

## Branch Naming Convention

- Feature branches: `feature/description-in-kebab-case`
- Bug fix branches: `bugfix/issue-number-description`
- Hotfix branches: `hotfix/issue-number-description`
- Release branches: `release/version-number`

## Development Workflow

1. Create a new branch from `dev`:

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, commit, and push:

   ```bash
   git add .
   git commit -m "feat: your descriptive commit message"
   git push -u origin feature/your-feature-name
   ```

3. Create a Pull Request to merge into `dev`
4. After review and approval, merge using squash merge
5. Delete the feature branch after merging

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc)
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or modifying tests
- `chore:` - Changes to build process or auxiliary tools

## Deployment Process

1. Changes are merged into `dev` through PRs
2. When ready for release:
   - Create a `release/*` branch from `dev`
   - Update version numbers and CHANGELOG
   - Create PR to merge into `main`
3. After merge to `main`:
   - Vercel automatically deploys to production
   - Create a GitHub release with version tag
   - Merge `main` back into `dev`

## Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in values
4. Start development server: `npm run dev`

## Code Quality Checks

Before submitting a PR, ensure:

1. Code is formatted: `npm run format`
2. Linting passes: `npm run lint`
3. TypeScript compiles: `tsc --noEmit`
4. All tests pass: `npm test`
