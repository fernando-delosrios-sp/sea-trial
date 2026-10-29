# TES Event Dashboard

**Welcome to your TES event dashboard!**

## 🍻 Rules of engagement

- Use this space as the main communication hub for your TES event and avoid private messages.
- Consider this space a tool and a product: it will help us deliver a successful TES event now and streamline future deliveries.
- **TES deliverables list** tracks the current status of the TES event delivery and must be kept up-to-date and used for item-related communication.

---

## 👥 Participant roles & responsibilities

![Sales Engineer](../../assets/Sales%20Engineer%20banner.png)

### Lead Sales Engineer
- Responsible for overall TES event coordination and customer alignment.
- Identifies and documents TES deliverables in the Deliverables List.
- Ensures all customer feedback is captured in the space in English.
- Tech Specialists only work on items in the Deliverables List not blocked, finished or waiting on feedback.
- Reviews and accepts completed deliverables from the Tech Specialist.

![Tech Specialist](../../assets/Tech%20Specialist%20banner.png)

### Tech Specialist
- Responsible for technical implementation and delivering agreed solutions.
- Deliverables must contain visual proof (Loom video or recording) to be accepted by the Lead SE.
- Deliverables, when accepted, must include an artefact selection when complex and reusable.
- Ensures a global backup of the infrastructure configuration is added to the space at completion.

![Account Executive](../../assets/Account%20Executive%20banner.png)

### Account Executive
- Responsible for defining the TES event success criteria and commercial alignment.
- Identifies key customer stakeholders, decision-makers, and implementation partners.
- Actively protects project boundaries to avoid scope-creep during the event.

---

## 🧭 Initial flow & milestones

### Phase 1: Kickoff & Context (Day 0)
{{#if onboardingComplete}}
- [x] Run **Complete onboarding** — fill in opportunity details
{{else}}
- [ ] ⏳ Run **Complete onboarding** to fill in opportunity details and unlock the Requirements Agent.
{{/if}}
- [ ] Identify the main stakeholders
- [ ] Identify the partner
- [ ] Identify the competition
- [ ] **Lead SE:** Drop customer specifications into the pinned *📁 Materials & Requirements Drop* thread
- [ ] **Tech Specialist:** Verify tenant access and sandbox environment availability

### Phase 2: Scoping & Architecture (Day 1)
- [ ] **Lead SE:** Review extracted items in Requirements Canvas & click `[Plan Deliverables]`
- [ ] **Lead SE & TS:** Review proposed tasks, assign owners and due dates in Deliverables List
- [ ] **Tech Specialist:** Document system hostnames, endpoints, and connectivity in Infrastructure Canvas
- [ ] **Tech Specialist:** Validate connectivity (VA cluster / direct APIs) to target sources

### Phase 3: Build & Verification (Mid-Event)
- [ ] **Tech Specialist:** Progress assigned items to `Accepted` in Deliverables List
- [ ] **Tech Specialist:** Provide visual proof (Loom) & configuration summary when prompted by Verification Agent
- [ ] **Lead SE:** Monitor blockers, resolve incidents, and refresh Situation Report updates
- [ ] **AE:** Review customer-facing Situation Report with customer stakeholders

### Phase 4: Wrap-up & Handover (Event Close)
- [ ] **Tech Specialist:** Export connector configurations and backup environment
- [ ] **Tech Specialist:** Revoke temporary access and service credentials
- [ ] **Lead SE & AE:** Deliver final executive presentation using Situation Report
