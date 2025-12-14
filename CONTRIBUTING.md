# Contributing to Tax Adviser MCP Server

Thank you for considering contributing to the Tax Adviser MCP Server! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Be respectful and considerate
- Welcome newcomers and help them learn
- Focus on constructive criticism
- Accept responsibility for mistakes
- Show empathy towards others

### Unacceptable Behavior

- Harassment, discrimination, or trolling
- Publishing others' private information
- Spam or off-topic comments
- Any conduct inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- Git
- A code editor (VS Code recommended)
- Basic understanding of TypeScript
- Familiarity with Dutch tax system (helpful but not required)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/tax-adviser-mcp.git
   cd tax-adviser-mcp
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/original/tax-adviser-mcp.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Set Up Configuration

```bash
# Run setup wizard
npm run setup

# Or manually copy example config
cp data/config.example.yaml data/config.yaml
cp data/personal.example.md data/personal.md
```

### Build the Project

```bash
npm run build
```

### Run Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Start Development Server

```bash
npm run dev
```

## Project Structure

```
tax-adviser-mcp/
├── src/
│   ├── config/          # Configuration system
│   │   ├── loader.ts    # Config loader
│   │   └── schema.ts    # Zod validation schemas
│   ├── context/         # Business logic
│   │   ├── dutch-tax-knowledge.ts
│   │   └── personal-loader.ts
│   ├── services/        # External services
│   │   ├── knowledge-cache.ts
│   │   ├── telegram.ts
│   │   └── web-search.ts
│   ├── resources/       # MCP resources
│   │   ├── index.ts
│   │   ├── personal-profile.ts
│   │   ├── tax-calendar.ts
│   │   └── knowledge-base.ts
│   ├── tools/           # MCP tools
│   │   ├── index.ts
│   │   ├── get-tax-obligations.ts
│   │   ├── calculate-tax.ts
│   │   └── ... (8 more tools)
│   ├── types/           # TypeScript types
│   │   ├── index.ts
│   │   ├── personal.ts
│   │   ├── tax.ts
│   │   └── knowledge.ts
│   ├── index.ts         # MCP server entry
│   └── daemon.ts        # Background daemon
├── scripts/             # Utility scripts
├── tests/               # Test files
├── data/                # Data files
└── knowledge/           # Knowledge cache
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Changes

- Write clean, readable code
- Follow TypeScript best practices
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Fix lint issues
npm run lint:fix

# Run type checker
npm run type-check

# Run tests
npm test

# Run all checks
npm run validate && npm run build && npm test
```

### 4. Commit Your Changes

We use conventional commits:

```bash
git add .
git commit -m "feat: add new tax calculation feature"
```

Commit message format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(tools): add get_spending_advice tool

Implements personalized financial advice based on user profile.
Includes tax reduction, wealth building, and debt management recommendations.

Closes #123
```

```
fix(knowledge): correct expiry date calculation

Fixed off-by-one error in expiry date calculation that caused
entries to expire one day early.

Fixes #456
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Coding Standards

### TypeScript Style Guide

#### General Rules

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Keep functions small and focused
- Use async/await over promises
- Handle errors explicitly

#### Naming Conventions

```typescript
// Classes: PascalCase
class TaxCalculator {}

// Interfaces/Types: PascalCase with descriptive names
interface TaxObligation {}
type CalculationResult = {};

// Functions/Methods: camelCase
function calculateTax() {}

// Constants: UPPER_SNAKE_CASE
const MAX_CACHE_ENTRIES = 1000;

// Private fields: prefix with underscore
class MyClass {
  private _privateField: string;
}
```

#### File Organization

```typescript
// 1. Imports (grouped)
import type { Config } from './types.js';
import { loadConfig } from './config.js';
import * as fs from 'fs';

// 2. Type definitions
interface MyInterface {}

// 3. Constants
const CONSTANT_VALUE = 100;

// 4. Main class/function
export class MyClass {}

// 5. Helper functions (private)
function helperFunction() {}
```

#### Comments

```typescript
/**
 * Calculate Dutch income tax for Box 1
 *
 * @param income - Gross income in euros
 * @returns Net tax liability after credits
 */
function calculateBox1Tax(income: number): number {
  // Check for negative income
  if (income < 0) {
    return 0;
  }

  // Apply progressive tax brackets
  let tax = 0;
  // ... calculation logic

  return tax;
}
```

### Error Handling

Always handle errors explicitly:

```typescript
// Good
try {
  const data = await fetchData();
  return { success: true, data };
} catch (error) {
  console.error('Failed to fetch data:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
}

// Bad
const data = await fetchData(); // Unhandled potential error
```

### Async/Await

Prefer async/await over promises:

```typescript
// Good
async function loadProfile(): Promise<Profile> {
  const data = await fs.promises.readFile('profile.md', 'utf-8');
  return parseProfile(data);
}

// Avoid
function loadProfile(): Promise<Profile> {
  return fs.promises.readFile('profile.md', 'utf-8')
    .then(data => parseProfile(data));
}
```

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FeatureName', () => {
  beforeEach(() => {
    // Setup
  });

  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = doSomething(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### What to Test

1. **Happy paths** - Normal expected behavior
2. **Edge cases** - Boundary conditions
3. **Error cases** - Invalid input, failures
4. **Integration** - Components working together

### Test Coverage Goals

- **Minimum**: 70% overall coverage
- **Critical code**: 90%+ coverage (tax calculations, tools)
- **Happy to skip**: Pure type definitions, trivial getters

### Mocking

Use vitest's mocking capabilities:

```typescript
import { vi } from 'vitest';

// Mock module
vi.mock('./module.js', () => ({
  exportedFunction: vi.fn()
}));

// Mock implementation
mockFunction.mockReturnValue('value');
mockFunction.mockResolvedValue('async value');
mockFunction.mockImplementation(() => 'custom');
```

## Documentation

### Code Documentation

- Document all public APIs
- Use JSDoc comments
- Include examples for complex functions
- Keep documentation up-to-date

### README Updates

When adding features:
1. Update feature list
2. Add usage examples
3. Update table of contents
4. Add to roadmap if applicable

### API Documentation

Update `API.md` for:
- New tools
- New resources
- Changed schemas
- New examples

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Added tests for new features
- [ ] Documentation updated
- [ ] No lint errors
- [ ] Type checking passes
- [ ] Commit messages follow conventions

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Passes all CI checks
```

### Review Process

1. Automated checks must pass (tests, lint, type-check)
2. At least one maintainer approval required
3. All review comments addressed
4. Squash commits before merge (if needed)

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Creating a Release

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag:
   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```
4. GitHub Actions will create the release

## Common Tasks

### Adding a New Tool

1. Create tool file in `src/tools/`:
   ```typescript
   export class MyNewTool implements ToolHandler {
     name = 'my_new_tool';
     description = 'Tool description';
     inputSchema = { /* ... */ };

     async execute(input: MyInput): Promise<MyOutput> {
       // Implementation
     }
   }
   ```

2. Register in `src/tools/index.ts`:
   ```typescript
   this.register(new MyNewTool(config, deps));
   ```

3. Add types to `src/types/tools.ts`
4. Add tests to `tests/my-new-tool.test.ts`
5. Document in `API.md`

### Adding a New Resource

1. Create resource handler in `src/resources/`
2. Register in `src/resources/index.ts`
3. Add tests
4. Document in `API.md`

### Updating Tax Rules

1. Edit `data/dutch-tax-rules.json`
2. Update year field
3. Update all relevant rates
4. Add tests for new rules
5. Update documentation

## Questions?

- **Bug reports**: [GitHub Issues](https://github.com/yourusername/tax-adviser-mcp/issues)
- **Feature requests**: [GitHub Discussions](https://github.com/yourusername/tax-adviser-mcp/discussions)
- **Questions**: [GitHub Discussions](https://github.com/yourusername/tax-adviser-mcp/discussions)
- **Email**: support@example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**
