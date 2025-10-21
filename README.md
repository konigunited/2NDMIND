# 🧠 MindOS — Your Second Brain

**A next-generation thinking environment where ideas live, connect, and evolve.**

---

## 🌟 What Makes MindOS Different

Unlike Obsidian or Notion, MindOS is **not a file system** — it's a **living model of your thinking**:

- ✨ **One Model, Three Views** — Markdown, Canvas, and Graph are different projections of the same data
- 🎯 **Direct Manipulation** — Drag nodes, tags, frames. Everything responds to your gestures
- 📐 **Structured, Not Chaotic** — Physics with constraints. Graphs that are readable, not "jelly"
- 🔗 **Typed Relationships** — Not just links, but `causes`, `supports`, `contrasts`, `extends`
- 🧭 **Auto-Layout Magic** — Press "Reorder" and chaos becomes structure
- 🎨 **Built for Deep Work** — Dark, calm, focused interface

---

## 🚀 Quick Start

```bash
# Clone the project
cd mindos

# Install dependencies
npm install

# Run dev server
npm run dev

# Open browser
http://localhost:5173
```

---

## 🧩 Core Features (MVP)

### ✅ Implemented

- [x] **Core Data Model** — Node, Edge, Block, Frame, Tag
- [x] **Zustand Store** — Centralized state management with Immer
- [x] **IndexedDB Persistence** — Auto-save every 5 seconds
- [x] **View Switcher** — Markdown / Canvas / Graph / Tree
- [x] **Design System** — Colors, spacing, typography, animations

### 🔨 In Progress

- [ ] **Markdown Editor** (TipTap) — Block-based, drag'n'drop
- [ ] **Canvas View** — Infinite canvas with node positioning
- [ ] **Graph View** — Three.js with constrained physics
- [ ] **Reorder Button** — Auto-layout algorithms
- [ ] **Undo/Redo** — Full history management

### 🔮 Coming Soon

- [ ] **Frames & Tags** — Auto-grouping, lenses, filters
- [ ] **Tree Explorer** — Hierarchical navigation
- [ ] **Relation Explorer** — Visual reasoning chains
- [ ] **Export/Import** — JSON, Markdown, CSV
- [ ] **Collaboration** (V2) — Real-time CRDT sync

---

## 📁 Project Structure

```
mindos/
├── src/
│   ├── types/
│   │   └── core.ts              # Core data model
│   ├── stores/
│   │   └── useAppStore.ts       # Zustand store
│   ├── lib/
│   │   └── db.ts                # IndexedDB (Dexie)
│   ├── utils/
│   │   ├── id.ts                # ID generation
│   │   └── factories.ts         # Entity factories
│   ├── hooks/
│   │   └── usePersistence.ts    # Auto-save hook
│   ├── components/
│   │   ├── markdown/            # TipTap editor
│   │   ├── canvas/              # Infinite canvas
│   │   ├── graph/               # Three.js graph
│   │   └── common/              # Shared components
│   ├── App.tsx                  # Main app
│   └── App.css                  # Styles
├── DESIGN_BIBLE.md              # Design system
└── README.md                    # This file
```

---

## 🧱 Architecture

### Data Flow

```
User Action
    ↓
Zustand Store (with Immer)
    ↓
IndexedDB (auto-save)
    ↓
React Components
```

### Core Entities

```typescript
Node     // Text, position, tags, content
Edge     // Typed connection (causes, supports, etc.)
Block    // Markdown block (heading, paragraph, task)
Frame    // Grouping container with rules
Tag      // Active entity (lens, filter)
```

### Views

1. **Markdown** — Block editor (TipTap)
2. **Canvas** — Visual cards on infinite canvas
3. **Graph** — Network with constrained physics
4. **Tree** — Hierarchical explorer

---

## 🎨 Design System

See [DESIGN_BIBLE.md](./DESIGN_BIBLE.md) for:

- Color palette (dark theme)
- Spacing system (4px grid)
- Typography (system fonts)
- Animations (150-400ms)
- Physics constraints (maxOffset: 32px)
- Component states

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **State** | Zustand + Immer |
| **Persistence** | Dexie (IndexedDB) |
| **Markdown** | TipTap |
| **Graph** | Three.js + react-three-fiber |
| **Physics** | d3-force (constrained) |

---

## 🧪 Key Concepts

### 1. Constrained Physics

Unlike traditional force-directed graphs, MindOS uses **limited physics**:

```typescript
const PHYSICS = {
  maxOffset: 32,        // Max distance from ideal position
  returnDuration: 500,  // Return animation duration (ms)
  forces: {
    spring: 0.1,        // Edge attraction
    repulsion: 100,     // Node repulsion
    frameMagnet: 0.05,  // Frame attraction
  }
}
```

**Result:** Nodes feel alive but never chaotic.

### 2. Typed Edges

Not just "links" — semantic relationships:

```typescript
enum EdgeType {
  CAUSES,       // A → B (causality)
  SUPPORTS,     // A supports B (evidence)
  CONTRASTS,    // A vs B (opposition)
  EXTENDS,      // A extends B (inheritance)
  PART_OF,      // A is part of B (composition)
  // ... more
}
```

### 3. Transformations

```typescript
// Markdown block → Canvas node
transformToCanvas(blockId)

// Canvas node → Markdown blocks
transformToMarkdown(nodeId)

// Any view → Graph node
// (always available, no transformation needed)
```

### 4. Frames (Auto-Grouping)

```typescript
const frame: Frame = {
  title: "Design Ideas",
  rules: [
    { type: 'tag', value: 'design' },      // All #design nodes
    { type: 'search', value: 'TODO' },     // Contains "TODO"
    { type: 'relation', value: 'causes:nodeId' }  // Causal chain
  ]
}
```

---

## 🎯 Roadmap

### Phase 1: MVP (Current)
- Core data model ✅
- Basic views (placeholders) ✅
- Persistence ✅
- Design system ✅

### Phase 2: Views
- Markdown editor (TipTap)
- Canvas (infinite, drag'n'drop)
- Graph (Three.js, physics)
- Reorder button

### Phase 3: Advanced Features
- Frames & auto-grouping
- Tag lenses
- Tree/Relation explorers
- Export/Import

### Phase 4: Collaboration (V2)
- CRDT sync (Yjs)
- Presence (live cursors)
- Permissions
- Replay history

---

## 🤝 Contributing

This is a **concept project** demonstrating a new approach to thinking tools.

If you want to contribute:

1. Read [DESIGN_BIBLE.md](./DESIGN_BIBLE.md)
2. Check open issues
3. Follow the existing architecture
4. Keep it simple and direct

---

## 📖 Philosophy

> "Obsidian is a knowledge base.
>
> MindOS is a **thinking environment**."

**Principles:**

1. **One model, many views** — Not files, but entities
2. **Direct manipulation** — Drag, not click-through-menus
3. **Visual clarity** — Readable graphs, not chaos
4. **Constrained motion** — Alive, not jumpy
5. **Typed semantics** — Meaning, not just links

---

## 📄 License

MIT — Do whatever you want with this.

---

## 🔗 Links

- [Design Bible](./DESIGN_BIBLE.md)
- [Technical Spec](./docs/SPEC.md) *(to be created)*
- [Component Library](./docs/COMPONENTS.md) *(to be created)*

---

**Built with 🧠 by the MindOS team**

**Version:** 0.1.0-alpha
**Status:** Early Development
**Last Updated:** October 2025
