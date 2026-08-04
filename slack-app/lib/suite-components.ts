/** Static mapping from SailPoint suite to technical components. */
const SUITE_COMPONENTS: Record<string, string[]> = {
  "Identity Security Cloud": [
    "IdentityNow",
    "Access Management",
    "Lifecycle Management",
    "Certification",
    "Password Management",
    "SaaS Connectors",
  ],
  "IdentityIQ": [
    "IdentityIQ Core",
    "Lifecycle Manager",
    "Access Request",
    "Certification",
    "Password Management",
    "Connector Framework",
  ],
  "IdentityNow": [
    "IdentityNow Core",
    "Access Profiles",
    "Certification Campaigns",
    "SaaS Connectors",
    "Password Management",
  ],
};

/**
 * Derives technical components from the selected SailPoint suite.
 * @param sailpointSuite - Suite name from onboarding form
 * @returns Module list for the suite, or empty array if unknown
 */
export function deriveComponents(sailpointSuite: string): string[] {
  return SUITE_COMPONENTS[sailpointSuite] ?? [];
}

/** Returns all supported suite names for form options. */
export function getSupportedSuites(): string[] {
  return Object.keys(SUITE_COMPONENTS);
}
