import { create } from "zustand";
import type {
  SystemModel,
  ModelPhase,
  CollisionResult,
  NarrativeResult,
  NarrativeMode,
  SystemModelNode,
  SystemModelLink,
} from "./types";

interface SystemModelerState {
  // Core model
  model: SystemModel | null;
  phase: ModelPhase;

  // Input
  inputTopic: string;
  useRag: boolean;

  // Selection & highlighting
  selectedNodeId: string | null;
  selectedLoopId: string | null;
  highlightedNodeIds: string[];
  highlightedLinkIndices: number[];

  // Filters
  activeFilters: {
    reinforcing: boolean;
    balancing: boolean;
    nodes: boolean;
  };
  forceActive: boolean;

  // UI state
  isLoading: boolean;
  progressMessage: string;
  progressPercent: number;
  error: string | null;
  isSidePanelOpen: boolean;
  isAboutOpen: boolean;
  isChatOpen: boolean;

  // Phase 3 & 4 results
  collisionResult: CollisionResult | null;
  narrativeResult: NarrativeResult | null;
  narrativeMode: NarrativeMode;
  illustrationDataUrl: string | null;
  characterImages: Record<string, string>;

  // Undo
  history: SystemModel[];

  // Chat panel
  chatPanelWidth: number;

  // Flash highlight (internal)
  _highlightTimeoutId: ReturnType<typeof setTimeout> | null;
}

interface SystemModelerActions {
  // Model
  setModel: (model: SystemModel | null) => void;
  setPhase: (phase: ModelPhase) => void;

  // Input
  setInputTopic: (topic: string) => void;
  setUseRag: (useRag: boolean) => void;

  // Selection
  selectNode: (nodeId: string | null) => void;
  selectLoop: (loopId: string | null) => void;
  setHighlightedNodes: (nodeIds: string[]) => void;
  setHighlightedLinks: (indices: number[]) => void;
  clearSelection: () => void;

  // Model mutations
  addNode: (node: SystemModelNode) => void;
  removeNode: (nodeId: string) => void;
  addLink: (link: SystemModelLink) => void;
  removeLink: (sourceId: string, targetId: string) => void;
  changeLoopType: (loopId: string, newType: "R" | "B") => void;

  // Filters
  toggleFilter: (filter: "reinforcing" | "balancing" | "nodes") => void;
  toggleForce: () => void;

  // UI
  setLoading: (loading: boolean) => void;
  setProgress: (message: string, percent: number) => void;
  setError: (error: string | null) => void;
  setSidePanelOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;

  // Phase results
  setCollisionResult: (result: CollisionResult | null) => void;
  setNarrativeResult: (result: NarrativeResult | null) => void;
  setNarrativeMode: (mode: NarrativeMode) => void;
  setIllustration: (dataUrl: string | null) => void;
  setCharacterImage: (name: string, dataUrl: string) => void;
  clearCharacterImages: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;

  // Chat panel
  setChatPanelWidth: (width: number) => void;

  // Flash highlight (temporary, auto-clears)
  flashHighlight: (nodeIds: string[], linkIndices?: number[], durationMs?: number) => void;

  // Reset
  reset: () => void;
}

const initialState: SystemModelerState = {
  model: null,
  phase: "input",
  inputTopic: "",
  useRag: false,
  selectedNodeId: null,
  selectedLoopId: null,
  highlightedNodeIds: [],
  highlightedLinkIndices: [],
  activeFilters: { reinforcing: true, balancing: true, nodes: true },
  forceActive: true,
  isLoading: false,
  progressMessage: "",
  progressPercent: 0,
  error: null,
  isSidePanelOpen: false,
  isAboutOpen: false,
  isChatOpen: true,
  collisionResult: null,
  narrativeResult: null,
  narrativeMode: "story" as NarrativeMode,
  illustrationDataUrl: null,
  characterImages: {},
  history: [],
  chatPanelWidth: 380,
  _highlightTimeoutId: null,
};

export const useSystemModelerStore = create<
  SystemModelerState & SystemModelerActions
>((set, get) => ({
  ...initialState,

  setModel: (model) => set({ model }),
  setPhase: (phase) => set({ phase }),

  setInputTopic: (inputTopic) => set({ inputTopic }),
  setUseRag: (useRag) => set({ useRag }),

  selectNode: (nodeId) =>
    set({
      selectedNodeId: nodeId,
      selectedLoopId: null,
      isSidePanelOpen: nodeId !== null,
    }),

  selectLoop: (loopId) => {
    const { model } = get();
    if (!model || !loopId) {
      set({ selectedLoopId: null, highlightedNodeIds: [], highlightedLinkIndices: [] });
      return;
    }
    const loop = model.loops.find((l) => l.id === loopId);
    if (loop) {
      const linkIndices = model.links
        .map((l, i) => (loop.nodes.includes(l.source) && loop.nodes.includes(l.target) ? i : -1))
        .filter((i) => i !== -1);
      set({
        selectedLoopId: loopId,
        selectedNodeId: null,
        highlightedNodeIds: [...new Set(loop.nodes)],
        highlightedLinkIndices: linkIndices,
        isSidePanelOpen: true,
      });
    }
  },

  setHighlightedNodes: (nodeIds) => set({ highlightedNodeIds: nodeIds }),
  setHighlightedLinks: (indices) => set({ highlightedLinkIndices: indices }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedLoopId: null,
      highlightedNodeIds: [],
      highlightedLinkIndices: [],
      isSidePanelOpen: false,
    }),

  addNode: (node) => {
    const { model } = get();
    if (!model) return;
    // Prevent duplicate node IDs
    if (model.nodes.some((n) => n.id === node.id)) return;
    get().pushHistory();
    set({
      model: { ...model, nodes: [...model.nodes, node] },
    });
  },

  removeNode: (nodeId) => {
    const { model } = get();
    if (!model) return;
    get().pushHistory();
    set({
      model: {
        ...model,
        nodes: model.nodes.filter((n) => n.id !== nodeId),
        links: model.links.filter(
          (l) => l.source !== nodeId && l.target !== nodeId
        ),
        loops: model.loops.map((loop) => ({
          ...loop,
          nodes: loop.nodes.filter((n) => n !== nodeId),
        })),
      },
      selectedNodeId: null,
    });
  },

  addLink: (link) => {
    const { model } = get();
    if (!model) return;
    // Prevent duplicate links
    if (model.links.some((l) => l.source === link.source && l.target === link.target)) return;
    get().pushHistory();
    set({
      model: { ...model, links: [...model.links, link] },
    });
  },

  removeLink: (sourceId, targetId) => {
    const { model } = get();
    if (!model) return;
    get().pushHistory();
    set({
      model: {
        ...model,
        links: model.links.filter(
          (l) => !(l.source === sourceId && l.target === targetId)
        ),
      },
    });
  },

  changeLoopType: (loopId, newType) => {
    const { model } = get();
    if (!model) return;
    get().pushHistory();
    set({
      model: {
        ...model,
        loops: model.loops.map((loop) =>
          loop.id === loopId
            ? { ...loop, type: newType, id: newType + loop.id.slice(1) }
            : loop
        ),
      },
    });
  },

  toggleFilter: (filter) =>
    set((state) => ({
      activeFilters: {
        ...state.activeFilters,
        [filter]: !state.activeFilters[filter],
      },
    })),

  toggleForce: () => set((state) => ({ forceActive: !state.forceActive })),

  setLoading: (isLoading) => set({ isLoading, ...(isLoading ? {} : { progressMessage: "", progressPercent: 0 }) }),
  setProgress: (progressMessage, progressPercent) => set({ progressMessage, progressPercent }),
  setError: (error) => set({ error }),
  setSidePanelOpen: (isSidePanelOpen) => set({ isSidePanelOpen }),
  setAboutOpen: (isAboutOpen) => set({ isAboutOpen }),
  setChatOpen: (isChatOpen) => set({ isChatOpen }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  setCollisionResult: (collisionResult) => set({ collisionResult }),
  setNarrativeResult: (narrativeResult) => set({ narrativeResult }),
  setNarrativeMode: (narrativeMode) => set({ narrativeMode }),
  setIllustration: (illustrationDataUrl) => set({ illustrationDataUrl }),
  setCharacterImage: (name, dataUrl) => set((state) => ({ characterImages: { ...state.characterImages, [name]: dataUrl } })),
  clearCharacterImages: () => set({ characterImages: {} }),

  pushHistory: () => {
    const { model, history } = get();
    if (model) {
      set({ history: [...history.slice(-19), JSON.parse(JSON.stringify(model))] });
    }
  },

  undo: () => {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ model: previous, history: history.slice(0, -1) });
  },

  setChatPanelWidth: (chatPanelWidth) => set({ chatPanelWidth: Math.min(Math.max(chatPanelWidth, 280), 600) }),

  flashHighlight: (nodeIds, linkIndices = [], durationMs = 3000) => {
    const prev = get()._highlightTimeoutId;
    if (prev) clearTimeout(prev);
    set({ highlightedNodeIds: nodeIds, highlightedLinkIndices: linkIndices });
    const timeoutId = setTimeout(() => {
      set({ highlightedNodeIds: [], highlightedLinkIndices: [], _highlightTimeoutId: null });
    }, durationMs);
    set({ _highlightTimeoutId: timeoutId });
  },

  reset: () => set(initialState),
}));
