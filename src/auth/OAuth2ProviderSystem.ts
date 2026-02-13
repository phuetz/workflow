/**
 * OAuth2 Provider System
 * Complete OAuth2 authorization server implementation
 * Allows third-party applications to integrate with the workflow platform
 *
 * REFACTORED: This file is now a facade that re-exports from modular components.
 * Original file was 1690 LOC, now split following SOLID principles:
 *
 * - src/auth/oauth2/types.ts - Type definitions (~310 LOC)
 * - src/auth/oauth2/ProviderRegistry.ts - Client/scope management (~280 LOC)
 * - src/auth/oauth2/TokenManager.ts - Token operations (~350 LOC)
 * - src/auth/oauth2/AuthorizationFlow.ts - Auth flows (~380 LOC)
 * - src/auth/oauth2/index.ts - Barrel export + facade (~200 LOC)
 *
 * @see src/auth/oauth2/ for implementation details
 */

// Re-export everything from the modular implementation
export * from './oauth2';

// Re-export the facade class and singleton for backwards compatibility
export { OAuth2ProviderSystem, oauth2Provider } from './oauth2';
