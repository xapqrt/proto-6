# Migration Plan for LifeOS

## Current Status
✅ All authentication API routes have been standardized
✅ Configuration has been centralized
✅ Middleware has been fixed to properly handle authentication

## Tasks Remaining

### 1. Component Library Cleanup
- [ ] Move all UI components from root to `/components/ui/`
- [ ] Delete duplicate components in `/src/components`

### 2. Page Standardization
- [ ] Ensure all pages are correctly located in `/app/*`
- [ ] Remove duplicate pages in `/src/app`

### 3. Directory Structure Cleanup
- [ ] Keep only these top-level directories:
  - `/app` (Next.js App Router pages)
  - `/components` (React components)
  - `/hooks` (React hooks)
  - `/lib` (Utility functions)
  - `/models` (Data models)
  - `/public` (Static assets)
  - `/types` (TypeScript types)

### 4. Project Housekeeping
- [ ] Update imports in all files to use the new paths
- [ ] Run a full test of the authentication flow
- [ ] Update tsconfig.json and next.config.js if needed

## Standards to Follow

### API Routes
All API routes should be located in `/app/api/` following Next.js App Router conventions.

### Authentication
- All auth-related API endpoints in `/app/api/auth/`
- Auth components in `/components/auth/`
- Auth hooks in `/hooks/`

### Configuration
All environment variables and configuration should use the centralized config in `/lib/config.ts`

### Logging Standards
All server-side functions should use consistent logging with this pattern:
```typescript
console.log('ComponentName: Message about action');
console.error('ComponentName: Error details:', error);
```

## Code Migration Standards

When moving files:
1. First create the file in the new location
2. Mark the old file as deprecated with a comment pointing to the new location
3. Update all imports to point to the new location
4. After confirming everything works, delete the old file

## Running the Migration
This migration should be done incrementally, testing authentication after each major change.