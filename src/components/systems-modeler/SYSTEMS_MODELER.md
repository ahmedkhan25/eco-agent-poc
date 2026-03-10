# Systems Modeler

An AI-powered interactive causal loop diagram (CLD) builder based on **Gene Bellinger's systems thinking methodology**. It transforms any topic into a living system model — with feedback loops, leverage points, concept collisions, and human narratives — through a five-phase guided workflow.

## What It Does

The Systems Modeler takes a topic (e.g., "urban housing affordability" or "coral reef decline") and:

1. **Generates** a causal loop diagram with 8–15 interconnected variables, feedback loops, time lags, and system archetypes
2. **Lets you iterate** on the model via a CopilotKit AI chat sidebar — add/remove nodes, reclassify loops, highlight variables, and discuss dynamics conversationally
3. **Collides** the model with an unrelated concept (the "Aha! Paradox") to break assumptions and reveal hidden relationships
4. **Humanizes** the diagram into a grounded prose narrative with real-world characters, stakeholder perspectives, and exportable HTML stories

All models are exportable as **raw JSON** (for data portability) and **self-contained interactive HTML** (for sharing visualizations with anyone — no dependencies except D3.js).

---

## The Five Phases

| Phase | Name | What Happens |
|-------|------|--------------|
| 1 | **Input** | User enters a topic, optionally pastes source text or enables RAG document retrieval |
| 2 | **Generate** | GPT-4o creates the initial `SystemModel` JSON with nodes, links, loops, and archetypes |
| 3 | **Iterate** | Human-in-the-loop refinement via CopilotKit chat sidebar — AI can add/remove nodes and links, change loop types, highlight nodes for discussion |
| 4 | **Collide** | "Aha! Paradox" — the model is collided with an unrelated concept (e.g., Mycelial Network, Jazz Improvisation) to identify the system's "load-bearing delusion" and reveal hidden dynamics |
| 5 | **Humanize** | Model is transformed into an 800–1200 word grounded narrative with real stakeholders, plus AI-generated illustrations via Google Gemini |

---

## Graph Visualization

The causal loop diagram is rendered with **D3.js force simulation**:

- **Nodes** are colored circles categorized by type (pressure, population, social, solution, environment, resource, policy, economic)
- **Key nodes** (leverage points) are larger with a pulse animation
- **Links** are curved arcs with arrowheads — red for reinforcing (+), blue for balancing (-)
- **Time lags** appear as labels on each link (e.g., "Months", "1–3 Years")
- **Loop badges** (R1, B2, etc.) float at the centroid of their member nodes
- Nodes are **draggable** with physics-aware snapping
- **Zoom** (0.2x–3x), **pan**, and **physics toggle** controls in the toolbar
- Clicking a node or loop opens a **side panel** with details, description, and connections

---

## Copilot Sidebar

The iterate phase features a **CopilotKit chat panel** (380px on desktop, toggle on mobile) that:

- Has full read access to the current model, selected node, and phase via `useCopilotReadable`
- Exposes 7 AI actions via `useCopilotAction`:
  - `updateSystemModel` — replace the entire model
  - `addNode` — add a new variable
  - `removeNode` — remove a variable and its connected links
  - `addLink` — add a causal relationship
  - `removeLink` — remove a link
  - `changeLoopType` — toggle a loop between R and B
  - `highlightNodes` — visually highlight nodes in the diagram
- Supports full **undo history** (up to 20 states)

---

## JSON Format Specification

The core data model is a `SystemModel` object. This is the format used for JSON export and what the AI generates/manipulates at every phase.

### Complete Schema

```json
{
  "name": "Name of the system model",
  "description": "Brief description of the system being modeled",
  "nodes": [
    {
      "id": "unique_short_id",
      "label": "Variable Name",
      "desc": "Description of what this variable represents and how it functions in the system",
      "example": "A concrete, real-world example (e.g., 'When Seattle added 50,000 new residents in 5 years, housing prices jumped 40%')",
      "category": "pressure | population | social | solution | environment | resource | policy | economic | default",
      "key": true
    }
  ],
  "links": [
    {
      "source": "source_node_id",
      "target": "target_node_id",
      "type": "reinforcing | balancing",
      "label": "+ | -",
      "lag": "Time delay (e.g., 'Months', '1-3 Years', 'Immediate')"
    }
  ],
  "loops": [
    {
      "id": "R1",
      "type": "R | B",
      "name": "Descriptive loop name",
      "desc": "Explanation of how this feedback loop operates",
      "nodes": ["node_id_1", "node_id_2", "node_id_3"]
    }
  ],
  "archetypes": [
    {
      "id": "archetype_id",
      "name": "System archetype name (e.g., 'Fixes that Fail', 'Shifting the Burden')",
      "description": "How this archetype manifests in the system",
      "relatedLoops": ["R1", "B2"]
    }
  ]
}
```

### Field Reference

#### Nodes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique short identifier (e.g., `"pop_growth"`, `"housing_price"`) |
| `label` | string | yes | Display name — should be a noun or noun phrase (a stock, not an action) |
| `desc` | string | yes | What this variable represents and how it functions in the system |
| `example` | string | no | Concrete real-world illustration with numbers, places, or dates when possible |
| `category` | NodeCategory | yes | One of: `pressure`, `population`, `social`, `solution`, `environment`, `resource`, `policy`, `economic`, `default` |
| `key` | boolean | no | `true` if this is a high-leverage intervention point (1–3 per model) |

#### Links

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | string | yes | ID of the source node |
| `target` | string | yes | ID of the target node |
| `type` | string | yes | `"reinforcing"` (same-direction causality) or `"balancing"` (opposite-direction) |
| `label` | string | yes | `"+"` for reinforcing, `"-"` for balancing |
| `lag` | string | yes | Human-readable time delay (e.g., `"Immediate"`, `"Months"`, `"1-3 Years"`, `"Decades"`) |

#### Loops

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Short ID like `"R1"`, `"B2"`, `"R3"` |
| `type` | string | yes | `"R"` (reinforcing — amplifies change) or `"B"` (balancing — resists change) |
| `name` | string | yes | Descriptive name for the feedback loop |
| `desc` | string | yes | How this loop operates and its systemic effect |
| `nodes` | string[] | yes | Array of node IDs that participate in this loop |

#### Archetypes

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier |
| `name` | string | yes | Standard archetype name (e.g., "Fixes that Fail", "Tragedy of the Commons", "Shifting the Burden", "Limits to Growth") |
| `description` | string | yes | How this archetype manifests in this specific system |
| `relatedLoops` | string[] | yes | Which loops participate in this archetype pattern |

### Example Model (Abbreviated)

```json
{
  "name": "Urban Housing Affordability",
  "description": "System dynamics of housing affordability in growing cities",
  "nodes": [
    {
      "id": "pop_growth",
      "label": "Population\nGrowth",
      "desc": "Rate of new residents moving into the urban area",
      "example": "Seattle added 50,000 new residents in 5 years",
      "category": "population",
      "key": true
    },
    {
      "id": "housing_price",
      "label": "Housing\nPrices",
      "desc": "Average cost of purchasing or renting housing",
      "example": "Median home price in Austin rose from $300K to $500K between 2019-2023",
      "category": "economic",
      "key": true
    },
    {
      "id": "zoning_rules",
      "label": "Zoning\nRestrictions",
      "desc": "Regulatory limits on housing density and type",
      "example": "75% of Seattle's residential land was zoned exclusively for single-family homes until 2023",
      "category": "policy"
    }
  ],
  "links": [
    {
      "source": "pop_growth",
      "target": "housing_price",
      "type": "reinforcing",
      "label": "+",
      "lag": "1-3 Years"
    },
    {
      "source": "zoning_rules",
      "target": "housing_price",
      "type": "reinforcing",
      "label": "+",
      "lag": "Years"
    }
  ],
  "loops": [
    {
      "id": "R1",
      "type": "R",
      "name": "Growth-Price Spiral",
      "desc": "Population growth drives demand, raising prices, which attracts developers, whose projects attract more population",
      "nodes": ["pop_growth", "housing_price"]
    }
  ],
  "archetypes": [
    {
      "id": "limits_growth",
      "name": "Limits to Growth",
      "description": "Housing construction initially responds to demand but hits zoning and infrastructure limits that constrain supply",
      "relatedLoops": ["R1", "B1"]
    }
  ]
}
```

---

## Exports

| Export | Format | Contents |
|--------|--------|----------|
| **Model JSON** | `.json` | Raw `SystemModel` — importable, version-controllable, machine-readable |
| **Interactive HTML** | `.html` | Self-contained D3.js visualization with zoom, drag, tooltips — no server needed |
| **Story HTML** | `.html` | Styled narrative with character cards, stakeholder perspectives, and embedded illustrations |

---

## File Structure

```
src/
├── app/systems-modeler/
│   ├── page.tsx                    # Route entry + metadata
│   ├── client.tsx                  # Dynamic import wrapper
│   └── layout.tsx                  # CopilotKit provider
├── app/api/systems-modeler/
│   ├── generate/route.ts           # Phase 2: GPT-4o model generation
│   ├── collide/route.ts            # Phase 4: Aha! Paradox collision
│   ├── humanize/route.ts           # Phase 5: Narrative generation
│   └── illustrate/route.ts        # Phase 5: Gemini image generation
├── components/systems-modeler/
│   ├── systems-modeler-page.tsx    # Main orchestrator + CopilotKit hooks
│   ├── causal-loop-diagram.tsx     # D3 force graph renderer
│   ├── diagram-side-panel.tsx      # Node/loop detail panel
│   ├── diagram-toolbar.tsx         # Zoom, physics, undo controls
│   ├── model-input-form.tsx        # Phase 1 topic input
│   ├── collision-dialog.tsx        # Phase 4 concept picker
│   ├── narrative-panel.tsx         # Phase 5 story display + export
│   ├── phase-indicator.tsx         # Phase progress bar
│   ├── progress-overlay.tsx        # Loading state overlay
│   ├── about-modal.tsx             # Info slideshow
│   └── napkin-viewer.tsx           # Aha! Paradox visualization
└── lib/systems-modeler/
    ├── types.ts                    # TypeScript interfaces
    ├── store.ts                    # Zustand state management
    ├── constants.ts                # Colors, force defaults
    ├── prompts.ts                  # All AI system prompts
    ├── d3-helpers.ts               # Graph layout utilities
    └── export-utils.ts             # HTML export generators
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Graph | D3.js force simulation |
| State | Zustand |
| AI Chat | CopilotKit (`useCopilotReadable`, `useCopilotAction`, `useCopilotChat`) |
| Model Generation | OpenAI GPT-4o (structured JSON output) |
| Illustrations | Google Gemini 3.1 Flash Image |
| Animation | Framer Motion |
| Styling | Tailwind CSS |
