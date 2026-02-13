/**
 * AI Provider Registry
 * 
 * This module exports all available AI providers and the factory for creating them.
 * Import this file to ensure all providers are registered with the factory.
 */

export { BaseAIProvider, ProviderFactory, type GenerationInput, type GenerationOutput, type ProviderCapabilities, type UsageInfo } from "./BaseProvider";

// Import all providers to register them with the factory
import "./ManusProvider";
import "./SoraProvider";
import "./RunwayProvider";
import "./ReplicateProvider";
import "./PikaProvider";

// Re-export individual providers for direct access if needed
export { ManusProvider } from "./ManusProvider";
export { SoraProvider } from "./SoraProvider";
export { RunwayProvider } from "./RunwayProvider";
export { ReplicateProvider } from "./ReplicateProvider";
export { PikaProvider } from "./PikaProvider";

/**
 * Get a provider instance by slug
 * 
 * @param slug - The provider slug (e.g., "manus", "openai-sora", "runway")
 * @param apiKey - The API key for the provider (not needed for built-in providers)
 * @returns A provider instance
 */
export function getProvider(slug: string, apiKey: string = ""): import("./BaseProvider").BaseAIProvider {
  const { ProviderFactory } = require("./BaseProvider");
  return ProviderFactory.create(slug, apiKey);
}

/**
 * Check if a provider is registered
 * 
 * @param slug - The provider slug to check
 * @returns True if the provider is registered
 */
export function isProviderRegistered(slug: string): boolean {
  const { ProviderFactory } = require("./BaseProvider");
  return ProviderFactory.getRegisteredProviders().includes(slug);
}

/**
 * Get all registered provider slugs
 * 
 * @returns Array of registered provider slugs
 */
export function getRegisteredProviders(): string[] {
  const { ProviderFactory } = require("./BaseProvider");
  return ProviderFactory.getRegisteredProviders();
}
