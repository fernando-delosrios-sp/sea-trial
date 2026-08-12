# Delivery: {{taskId}}

> {{#if reviewPending}}⚠️ **Agent draft — pending review** · {{/if}}Draft v{{draftVersion}} · {{generatedAt}}
> **Author:** {{author}} · **Category:** {{category}}
> **Actions:** [Consolidate draft]({{consolidateActionUrl}}) · [Mark reviewed]({{markReviewedActionUrl}})

---

## Business value
<!-- customer-facing -->
{{businessValue}}

## Visual proof
<!-- customer-facing -->
{{visualProof}}

## SailPoint components
<!-- customer-facing -->
{{sailpointComponents}}

## External technologies
<!-- customer-facing -->
{{externalTechnologies}}

## Customer summary
<!-- customer-facing · situation-report-excerpt -->
{{customerSummary}}

---

## Artefacts
<!-- internal -->
| Name | Type | Location | Version |
|------|------|----------|---------|
{{artefactRows}}

## Configuration
<!-- internal -->
{{configuration}}

---

## Notes
<!-- freeform additions -->
{{notes}}
