## MODIFIED Requirements

### Requirement: Suite-to-components mapping

The system SHALL derive technical components from the selected SailPoint suite via domain JSON loaded from `slack-app/content/domain/sailpoint-suites.json`. SailPoint suite select options in the onboarding modal SHALL be sourced from the same domain JSON without hardcoded option lists in TypeScript.

#### Scenario: Identity Security Cloud mapping

- **GIVEN** onboarding form with `sailpointSuite` set to "Identity Security Cloud"
- **WHEN** `deriveComponents` is called
- **THEN** the expected module list for that suite SHALL be returned from domain JSON

#### Scenario: Suite options from domain JSON

- **GIVEN** `sailpoint-suites.json` defines supported suite names
- **WHEN** the onboarding modal is built
- **THEN** the SailPoint Suite static_select options SHALL match the domain JSON suite keys
- **AND** no additional suites SHALL appear beyond those defined in domain JSON
