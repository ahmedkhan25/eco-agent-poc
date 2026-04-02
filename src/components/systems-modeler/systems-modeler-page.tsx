"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useCopilotReadable, useCopilotAction, useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import { MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useSystemModelerStore } from "@/lib/systems-modeler/store";
import {
  ITERATE_SYSTEM_PROMPT,
  buildProfessionalIllustrationPrompt,
  buildProfessionalPortraitPrompt,
} from "@/lib/systems-modeler/prompts";
import type { SystemModel, SystemModelNode, NodeCategory, NarrativeMode } from "@/lib/systems-modeler/types";
import { CausalLoopDiagram } from "./causal-loop-diagram";
import { PhaseIndicator } from "./phase-indicator";
import { ModelInputForm } from "./model-input-form";
import { DiagramToolbar } from "./diagram-toolbar";
import { DiagramSidePanel } from "./diagram-side-panel";
import { CollisionDialog } from "./collision-dialog";
import { NarrativePanel } from "./narrative-panel";
import { SystemsModelerAboutModal } from "./about-modal";
import { ProgressOverlay } from "./progress-overlay";
import { EcoheartLogo } from "@/components/ecoheart-logo";
import { ActionResult } from "./node-ref-chip";

export function SystemsModelerPage() {
  const store = useSystemModelerStore();

  // ── CopilotKit: Make current model readable by the AI ──
  useCopilotReadable({
    description: "The current causal loop diagram system model (JSON)",
    value: store.model ? JSON.stringify(store.model, null, 2) : "No model loaded yet.",
  });

  useCopilotReadable({
    description: "Currently selected node in the diagram",
    value: store.selectedNodeId
      ? JSON.stringify(
          store.model?.nodes.find((n) => n.id === store.selectedNodeId)
        )
      : "No node selected",
  });

  useCopilotReadable({
    description: "Current modeling phase",
    value: store.phase,
  });

  // ── CopilotKit: Register AI tools for Phase 2 (Iterate) ──
  useCopilotAction({
    name: "updateSystemModel",
    description:
      "Update the entire system model with new/modified nodes, links, and loops. Use this when making multiple changes at once.",
    parameters: [
      {
        name: "model",
        type: "object",
        description: "The complete updated SystemModel JSON",
        required: true,
      },
    ],
    handler: async ({ model }: { model: object }) => {
      const oldModel = store.model;
      store.pushHistory();
      store.setModel(model as SystemModel);
      // Compute diff for refs
      const newModel = model as SystemModel;
      const oldIds = new Set(oldModel?.nodes.map((n) => n.id) || []);
      const added = newModel.nodes.filter((n) => !oldIds.has(n.id));
      if (added.length > 0) {
        store.flashHighlight(added.map((n) => n.id));
      }
      return JSON.stringify({
        message: "Model updated. The diagram has been re-rendered.",
        addedNodes: added.map((n) => ({ id: n.id, label: n.label })),
      });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status === "executing") return <span className="text-xs text-[#9ab8a2]">Updating model...</span>;
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return (
          <ActionResult
            message={data.message}
            nodeRefs={data.addedNodes}
          />
        );
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  useCopilotAction({
    name: "addNode",
    description: "Add a new variable/node to the system model",
    parameters: [
      { name: "id", type: "string", description: "Unique short ID (lowercase, no spaces)", required: true },
      { name: "label", type: "string", description: "Display label (use \\n for line break)", required: true },
      { name: "desc", type: "string", description: "Description of the variable", required: true },
      { name: "category", type: "string", description: "Category: pressure|social|solution|environment|resource|policy|economic|default", required: true },
      { name: "isKey", type: "boolean", description: "Whether this is a key leverage point", required: false },
    ],
    handler: async ({ id, label, desc, category, isKey }: { id: string; label: string; desc: string; category: string; isKey?: boolean }) => {
      store.addNode({
        id,
        label,
        desc,
        category: category as NodeCategory,
        key: isKey || false,
      });
      store.flashHighlight([id]);
      return JSON.stringify({ message: `Added node "${label}" to the model.`, id, label });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status === "executing") return <span className="text-xs text-[#9ab8a2]">Adding node...</span>;
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return <ActionResult message={data.message} nodeRefs={[{ id: data.id, label: data.label }]} />;
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  useCopilotAction({
    name: "removeNode",
    description: "Remove a variable/node and its connected links from the model",
    parameters: [
      { name: "nodeId", type: "string", description: "ID of the node to remove", required: true },
    ],
    handler: async ({ nodeId }: { nodeId: string }) => {
      const node = store.model?.nodes.find((n) => n.id === nodeId);
      const label = node?.label || nodeId;
      store.removeNode(nodeId);
      return JSON.stringify({ message: `Removed node "${label}" and its connected links.`, id: nodeId, label });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status === "executing") return <span className="text-xs text-[#9ab8a2]">Removing node...</span>;
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return <ActionResult message={data.message} nodeRefs={[{ id: data.id, label: data.label, removed: true }]} />;
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  useCopilotAction({
    name: "addLink",
    description: "Add a new causal relationship/link between two nodes",
    parameters: [
      { name: "source", type: "string", description: "Source node ID", required: true },
      { name: "target", type: "string", description: "Target node ID", required: true },
      { name: "type", type: "string", description: "Link type: reinforcing or balancing", required: true },
      { name: "label", type: "string", description: "Polarity: + or -", required: true },
      { name: "lag", type: "string", description: "Time delay (e.g., 'Months', '1-3 Years')", required: true },
    ],
    handler: async ({ source, target, type, label, lag }: { source: string; target: string; type: string; label: string; lag: string }) => {
      store.addLink({
        source,
        target,
        type: type as "reinforcing" | "balancing",
        label: label as "+" | "-",
        lag,
      });
      store.flashHighlight([source, target]);
      return JSON.stringify({ message: `Added ${type} link from ${source} to ${target}.`, source, target, linkType: type });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status === "executing") return <span className="text-xs text-[#9ab8a2]">Adding link...</span>;
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return (
          <ActionResult
            message={data.message}
            linkRefs={[{ source: data.source, target: data.target, type: data.linkType }]}
          />
        );
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  useCopilotAction({
    name: "removeLink",
    description: "Remove a causal link between two nodes",
    parameters: [
      { name: "source", type: "string", description: "Source node ID", required: true },
      { name: "target", type: "string", description: "Target node ID", required: true },
    ],
    handler: async ({ source, target }: { source: string; target: string }) => {
      const linkType = store.model?.links.find((l) => l.source === source && l.target === target)?.type || "reinforcing";
      store.removeLink(source, target);
      return JSON.stringify({ message: `Removed link from ${source} to ${target}.`, source, target, linkType });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status === "executing") return <span className="text-xs text-[#9ab8a2]">Removing link...</span>;
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return <ActionResult message={data.message} nodeRefs={[{ id: data.source, label: data.source }, { id: data.target, label: data.target }]} />;
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  useCopilotAction({
    name: "changeLoopType",
    description: "Change a feedback loop's type between Reinforcing (R) and Balancing (B)",
    parameters: [
      { name: "loopId", type: "string", description: "Loop ID (e.g., 'R1', 'B2')", required: true },
      { name: "newType", type: "string", description: "New type: R or B", required: true },
    ],
    handler: async ({ loopId, newType }: { loopId: string; newType: string }) => {
      const loop = store.model?.loops.find((l) => l.id === loopId);
      const loopNodes = loop?.nodes || [];
      store.changeLoopType(loopId, newType as "R" | "B");
      if (loopNodes.length > 0) store.flashHighlight(loopNodes);
      const nodeRefs = loopNodes.map((id) => {
        const n = store.model?.nodes.find((node) => node.id === id);
        return { id, label: n?.label || id };
      });
      return JSON.stringify({
        message: `Changed loop ${loopId} to ${newType === "R" ? "Reinforcing" : "Balancing"}.`,
        nodeRefs,
      });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status === "executing") return <span className="text-xs text-[#9ab8a2]">Changing loop type...</span>;
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return <ActionResult message={data.message} nodeRefs={data.nodeRefs} />;
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  useCopilotAction({
    name: "highlightNodes",
    description: "Highlight specific nodes in the diagram to draw the user's attention",
    parameters: [
      { name: "nodeIds", type: "object", description: "Array of node IDs to highlight", required: true },
    ],
    handler: async ({ nodeIds }: { nodeIds: object }) => {
      const ids = nodeIds as string[];
      store.flashHighlight(ids);
      const nodeRefs = ids.map((id) => {
        const n = store.model?.nodes.find((node) => node.id === id);
        return { id, label: n?.label || id };
      });
      return JSON.stringify({ message: `Highlighted ${ids.length} node${ids.length > 1 ? "s" : ""} in the diagram.`, nodeRefs });
    },
    render: (props: { status: string; result?: unknown }) => {
      if (props.status !== "complete" || !props.result) return <></>;
      try {
        const data = typeof props.result === "string" ? JSON.parse(props.result) : props.result;
        return <ActionResult message={data.message} nodeRefs={data.nodeRefs} />;
      } catch {
        return <span className="text-xs text-[#9ab8a2]">{String(props.result)}</span>;
      }
    },
  });

  // ── Chat API for programmatic messages ──
  const { appendMessage } = useCopilotChat();

  // ── Handlers ──
  const handleGenerate = useCallback(
    async (topic: string, useRag: boolean, content?: string) => {
      store.setLoading(true);
      store.setError(null);
      store.setPhase("generate");
      store.setProgress("Preparing system analysis", 10);

      try {
        if (useRag) {
          store.setProgress("Retrieving Olympia RAG documents", 25);
        } else {
          store.setProgress("Analyzing topic context", 25);
        }

        // Small delay so the user sees the first message
        await new Promise((r) => setTimeout(r, 400));
        store.setProgress("GPT-5.4 is reasoning about your system model (this may take a moment)", 45);

        const res = await fetch("/api/systems-modeler/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, useRag, content }),
        });

        store.setProgress("Processing model response", 80);

        if (!res.ok) throw new Error(await res.text());

        const model: SystemModel = await res.json();
        store.setProgress("Rendering causal loop diagram", 95);

        store.setModel(model);
        store.setInputTopic(topic);
        store.setUseRag(useRag);
        store.setPhase("iterate");
      } catch (err) {
        store.setError(err instanceof Error ? err.message : "Failed to generate model");
        store.setPhase("input");
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const handleImport = useCallback(
    (model: SystemModel) => {
      store.setModel(model);
      store.setInputTopic(model.name || "Imported Model");
      store.setPhase("iterate");
    },
    [store]
  );

  const handleImportFallback = useCallback(
    async (topic: string, content: string) => {
      // Reuse the generate flow with extracted content as context
      store.setLoading(true);
      store.setError(null);
      store.setPhase("generate");
      store.setProgress("Analyzing imported file", 10);

      try {
        await new Promise((r) => setTimeout(r, 300));
        store.setProgress("AI is interpreting the file content", 35);

        const res = await fetch("/api/systems-modeler/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, content }),
        });

        store.setProgress("Processing model response", 80);
        if (!res.ok) throw new Error(await res.text());

        const model: SystemModel = await res.json();
        store.setProgress("Rendering causal loop diagram", 95);

        store.setModel(model);
        store.setInputTopic(topic);
        store.setPhase("iterate");
      } catch (err) {
        store.setError(
          err instanceof Error ? err.message : "Failed to import file"
        );
        store.setPhase("input");
      } finally {
        store.setLoading(false);
      }
    },
    [store]
  );

  const handleCollide = useCallback(
    async (concept: string) => {
      if (!store.model) return;
      const oldModel = store.model;
      store.setLoading(true);
      store.setError(null);
      store.setProgress("Initiating concept collision", 15);

      try {
        await new Promise((r) => setTimeout(r, 300));
        store.setProgress(`Colliding model with "${concept}"`, 30);

        await new Promise((r) => setTimeout(r, 300));
        store.setProgress("Identifying loadbearing delusions", 50);

        const res = await fetch("/api/systems-modeler/collide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: store.model, collisionConcept: concept }),
        });

        store.setProgress("Applying isomorphic mappings", 80);

        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        store.setProgress("Updating diagram with new insights", 95);
        store.setCollisionResult({
          concept,
          loadbearingDelusion: "",
          loadbearingDelusionExplanation: "",
          hiddenRelationships: [],
          isomorphMapping: data.narrative,
          updatedModel: data.updatedModel,
        });
        store.pushHistory();
        store.setModel(data.updatedModel);
        store.setPhase("iterate");

        // Compute diff and send to chat
        const newModel = data.updatedModel as SystemModel;
        const oldNodeIds = new Set(oldModel.nodes.map((n) => n.id));
        const newNodes = newModel.nodes.filter((n) => !oldNodeIds.has(n.id));
        const oldLinkKeys = new Set(oldModel.links.map((l) => `${l.source}->${l.target}`));
        const newLinks = newModel.links.filter((l) => !oldLinkKeys.has(`${l.source}->${l.target}`));
        const oldLoopIds = new Set(oldModel.loops.map((l) => l.id));
        const newLoops = newModel.loops.filter((l) => !oldLoopIds.has(l.id));

        // Highlight new nodes
        if (newNodes.length > 0) {
          store.setHighlightedNodes(newNodes.map((n) => n.id));
        }

        // Build summary message
        let summary = `## Aha! Paradox — Collision with "${concept}"\n\n`;
        if (data.narrative) {
          // Extract just the first couple of paragraphs for the chat
          const narrativeParagraphs = data.narrative.split("\n\n").slice(0, 3).join("\n\n");
          summary += narrativeParagraphs + "\n\n---\n\n";
        }
        summary += `**Changes to the model:**\n`;
        if (newNodes.length > 0) {
          summary += `\n**${newNodes.length} new variable${newNodes.length > 1 ? "s" : ""} added:**\n`;
          newNodes.forEach((n) => { summary += `- **${n.label}** — ${n.desc}\n`; });
        }
        if (newLinks.length > 0) {
          summary += `\n**${newLinks.length} new relationship${newLinks.length > 1 ? "s" : ""} added:**\n`;
          newLinks.forEach((l) => { summary += `- ${l.source} → ${l.target} (${l.type}, ${l.label})\n`; });
        }
        if (newLoops.length > 0) {
          summary += `\n**${newLoops.length} new loop${newLoops.length > 1 ? "s" : ""} identified:**\n`;
          newLoops.forEach((l) => { summary += `- **${l.id}** ${l.name} — ${l.desc}\n`; });
        }
        if (newNodes.length === 0 && newLinks.length === 0 && newLoops.length === 0) {
          summary += `\nThe model structure was refined but no new elements were added.\n`;
        }
        summary += `\n*All changes above have already been applied to the diagram automatically. The new nodes are highlighted. Do NOT call addNode, addLink, or updateSystemModel — the model is already updated. You can ask me to explain the changes or refine the model further.*`;

        // Open chat and send the summary
        store.setChatOpen(true);
        appendMessage(new TextMessage({
          role: MessageRole.Assistant,
          content: summary,
        }));
      } catch (err) {
        store.setError(err instanceof Error ? err.message : "Collision failed");
      } finally {
        store.setLoading(false);
      }
    },
    [store, appendMessage]
  );

  const handleHumanize = useCallback(async (mode: NarrativeMode = "story") => {
    if (!store.model) return;
    store.setNarrativeMode(mode);
    store.setLoading(true);
    store.setError(null);
    store.setIllustration(null);
    store.clearCharacterImages();

    const isProfessional = mode === "professional";
    store.setProgress(
      isProfessional ? "Preparing professional analysis & diagram" : "Preparing model narrative & illustration",
      10
    );

    try {
      await new Promise((r) => setTimeout(r, 300));
      store.setProgress(
        isProfessional
          ? "Generating analytical report & visualization in parallel"
          : "Crafting the Model Story & generating illustration in parallel",
        25
      );

      // Fire both requests in parallel
      const storyPromise = fetch("/api/systems-modeler/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: store.model, mode }),
      });

      const illustrationPrompt = isProfessional
        ? buildProfessionalIllustrationPrompt(store.model.name)
        : `Create a dramatic, mythic illustration in a storybook watercolor style for a systems model called "${store.model.name}". The scene should depict interconnected characters and forces in a symbolic, archetypal way with environmental elements like storms, rivers, buildings, and nature. Style: rich colors, atmospheric lighting, epic scale. Do NOT include any text or words in the image.`;
      const imagePromise = fetch("/api/systems-modeler/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: illustrationPrompt }),
      }).catch(() => null);

      store.setProgress(
        isProfessional ? "GPT-5.4 is reasoning through your report (this may take a moment)" : "GPT-5.4 is reasoning through your story (this may take a moment)",
        45
      );

      const storyRes = await storyPromise;
      store.setProgress("Processing results", 70);

      if (!storyRes.ok) throw new Error(await storyRes.text());
      const narrative = await storyRes.json();
      store.setNarrativeResult(narrative);

      store.setProgress("Waiting for illustration", 80);

      const imageRes = await imagePromise;
      if (imageRes && imageRes.ok) {
        const imageData = await imageRes.json();
        store.setIllustration(`data:${imageData.mimeType};base64,${imageData.image}`);
        store.setProgress(
          isProfessional ? "Report & visualization complete" : "Story & illustration complete",
          100
        );
      } else {
        store.setProgress(
          isProfessional ? "Report complete (visualization unavailable)" : "Story complete (illustration unavailable)",
          100
        );
      }

      store.setPhase("humanize");

      // Generate portraits in background
      if (narrative.characters?.length) {
        for (const char of narrative.characters) {
          const portraitPrompt = isProfessional
            ? buildProfessionalPortraitPrompt(char.name, char.role)
            : `Portrait of a character named "${char.name}" who represents "${char.representsNode}" in a mythic story. ${char.role}. Style: storybook watercolor portrait, bust/headshot, warm tones, expressive face, no text. Square format.`;
          fetch("/api/systems-modeler/illustrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: portraitPrompt }),
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.image) {
                store.setCharacterImage(char.name, `data:${data.mimeType};base64,${data.image}`);
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      store.setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const handleExportStory = useCallback(() => {
    const narrative = store.narrativeResult;
    if (!narrative) return;

    const isPro = store.narrativeMode === "professional" && narrative.professional;

    // Professional report export
    if (isPro && narrative.professional) {
      const pro = narrative.professional;
      const imageSection = store.illustrationDataUrl
        ? `<div class="illustration"><img src="${store.illustrationDataUrl}" alt="Visualization for ${narrative.title}" /></div>`
        : "";

      const stakeholderRows = (pro.stakeholderAnalysis || []).map(s => `
        <tr>
          <td><strong>${s.stakeholder}</strong></td>
          <td>${s.role}</td>
          <td><span class="badge badge-${s.influence}">${s.influence}</span></td>
          <td>${s.keyLoops.map(l => `<code>${l}</code>`).join(" ")}</td>
        </tr>
        <tr><td colspan="4" class="incentives">${s.incentives}</td></tr>`).join("\n");

      const insightCards = (pro.keyInsights || []).map(ins => `
        <div class="card">
          <div class="card-header">
            <span>${ins.insight}</span>
            <span class="badge badge-${ins.severity}">${ins.severity}</span>
          </div>
          <div class="meta"><code>${ins.relatedLoop}</code></div>
          <p>${ins.evidence}</p>
        </div>`).join("\n");

      const recCards = (pro.policyRecommendations || []).map(rec => `
        <div class="card">
          <div class="card-header"><span>${rec.recommendation}</span></div>
          <div class="meta">
            <code>${rec.targetLoop}</code>
            <span class="badge badge-${rec.difficulty}">${rec.difficulty}</span>
            <span class="badge badge-time">${rec.timeframe}</span>
          </div>
          <p><strong>Expected impact:</strong> ${rec.expectedImpact}</p>
        </div>`).join("\n");

      const proHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${narrative.title} — EcoHeart Professional Report</title>
<style>
  :root { --bg: #f8fafc; --text: #1e293b; --accent: #3b82f6; --border: #e2e8f0; --card-bg: #ffffff; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
  .header { margin-bottom: 32px; }
  .logo { font-size: 11px; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .accent-bar { width: 64px; height: 4px; background: linear-gradient(to right, #3b82f6, #6366f1); border-radius: 2px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  p { font-size: 14px; line-height: 1.7; margin-bottom: 12px; }
  .illustration { margin: 24px 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
  .illustration img { width: 100%; height: auto; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th { text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 2px solid var(--border); }
  td { padding: 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.incentives { font-size: 12px; color: #64748b; padding: 4px 8px 12px; border-bottom: 1px solid var(--border); }
  code { background: #eff6ff; color: #3b82f6; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .badge-high, .badge-critical { background: #fef2f2; color: #dc2626; }
  .badge-medium, .badge-significant { background: #fffbeb; color: #d97706; }
  .badge-low, .badge-moderate { background: #f0fdf4; color: #16a34a; }
  .badge-time { background: #f1f5f9; color: #64748b; }
  .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; font-weight: 600; }
  .meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
  .meta p { margin: 0; }
  .footer { text-align: center; margin-top: 48px; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">EcoHeart Systems Modeler</div>
    <h1>${narrative.title}</h1>
    <div class="accent-bar"></div>
  </div>
  <h2>Executive Summary</h2>
  ${pro.executiveSummary.split("\n\n").filter((p: string) => p.trim()).map((p: string) => `<p>${p}</p>`).join("\n")}
  <h2>System Dynamics Overview</h2>
  <p>${pro.systemDynamicsOverview}</p>
  ${imageSection}
  <h2>Stakeholder Analysis</h2>
  <table>
    <thead><tr><th>Stakeholder</th><th>Role</th><th>Influence</th><th>Key Loops</th></tr></thead>
    <tbody>${stakeholderRows}</tbody>
  </table>
  <h2>Key Insights</h2>
  ${insightCards}
  <h2>Policy Recommendations</h2>
  ${recCards}
  <h2>Archetype Analysis</h2>
  <p>${pro.archetypeAnalysis}</p>
  <div class="footer">Generated by EcoHeart Systems Modeler &mdash; Systems Dynamics Analysis</div>
</body>
</html>`;

      const blob = new Blob([proHtml], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${narrative.title.replace(/\s+/g, "-").toLowerCase()}-report.html`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }

    // Story mode export (unchanged)
    const paragraphs = narrative.narrative
      .split("\n\n")
      .filter((p: string) => p.trim().length > 0)
      .map((p: string) => `      <p>${p}</p>`)
      .join("\n");

    const characters = (narrative.characters || [])
      .map(
        (c: { name: string; representsNode: string; role: string }) => {
          const charImg = store.characterImages[c.name];
          const imgHtml = charImg
            ? `<img class="char-portrait" src="${charImg}" alt="${c.name}" />`
            : `<div class="char-portrait-placeholder"></div>`;
          return `
        <div class="character-card">
          ${imgHtml}
          <div class="char-info">
            <div class="char-name">${c.name}</div>
            <div class="char-represents">Represents: ${c.representsNode}</div>
            <div class="char-role">${c.role}</div>
          </div>
        </div>`;
        }
      )
      .join("\n");

    const imageSection = store.illustrationDataUrl
      ? `<div class="illustration"><img src="${store.illustrationDataUrl}" alt="Illustration for ${narrative.title}" /></div>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${narrative.title} — EcoHeart Model Story</title>
<style>
  :root { --bg: #fffbf0; --text: #3d2e1e; --accent: #b8860b; --border: #e6d5b8; --card-bg: #fef9ed; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--bg); color: var(--text); font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
  .header { text-align: center; margin-bottom: 40px; }
  .logo { font-size: 14px; color: var(--accent); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-size: 32px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
  .divider { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 24px 0; }
  .divider span { display: block; height: 1px; width: 48px; background: var(--border); }
  .divider-icon { color: var(--accent); font-size: 16px; }
  .narrative p { font-size: 16px; line-height: 1.8; margin-bottom: 16px; text-align: justify; }
  .narrative p:first-child::first-letter { font-size: 48px; font-weight: bold; float: left; margin-right: 6px; line-height: 1; color: var(--accent); }
  .illustration { margin: 32px 0; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
  .illustration img { width: 100%; height: auto; display: block; }
  .section-title { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 40px 0 20px; }
  .section-title span { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; color: var(--accent); }
  .characters { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .character-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; gap: 14px; align-items: flex-start; }
  .char-portrait { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); flex-shrink: 0; }
  .char-portrait-placeholder { width: 64px; height: 64px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
  .char-info { min-width: 0; }
  .char-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .char-represents { font-size: 12px; color: var(--accent); margin-bottom: 8px; }
  .char-role { font-size: 13px; color: #6b5c4a; line-height: 1.5; }
  .stakeholder-section { margin-top: 40px; }
  .stakeholder-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 12px; }
  .stakeholder-name { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .stakeholder-name::before { content: "\\25C6"; color: var(--accent); font-size: 10px; }
  .stakeholder-field { margin-bottom: 8px; }
  .stakeholder-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); margin-bottom: 2px; }
  .stakeholder-text { font-size: 13px; color: #6b5c4a; line-height: 1.6; }
  .stakeholder-text.italic { font-style: italic; }
  .footer { text-align: center; margin-top: 48px; font-size: 12px; color: #a89070; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">EcoHeart Systems Modeler</div>
    <h1>${narrative.title}</h1>
    <div class="divider"><span></span><div class="divider-icon">&#9670;</div><span></span></div>
  </div>
  ${imageSection}
  <div class="narrative">
${paragraphs}
  </div>
  <div class="section-title"><span>Characters</span></div>
  <div class="characters">
${characters}
  </div>
  ${(narrative.stakeholderPerspectives && narrative.stakeholderPerspectives.length > 0) ? `
  <div class="stakeholder-section">
    <div class="section-title"><span>Stakeholder Perspectives</span></div>
    <p style="text-align:center;font-size:12px;color:#a89070;font-style:italic;margin-bottom:16px;">The same system dynamics feel different depending on where you sit.</p>
    ${narrative.stakeholderPerspectives.map((sp: { stakeholder: string; narrativeShift: string; hook: string; emotionalCore: string }) => `
    <div class="stakeholder-card">
      <div class="stakeholder-name">${sp.stakeholder}</div>
      <div class="stakeholder-field">
        <div class="stakeholder-label">Narrative Shift</div>
        <div class="stakeholder-text">${sp.narrativeShift}</div>
      </div>
      <div class="stakeholder-field">
        <div class="stakeholder-label">The Hook</div>
        <div class="stakeholder-text">${sp.hook}</div>
      </div>
      <div class="stakeholder-field">
        <div class="stakeholder-label">Emotional Core</div>
        <div class="stakeholder-text italic">${sp.emotionalCore}</div>
      </div>
    </div>`).join("\n")}
  </div>` : ""}
  <div class="footer">Generated by EcoHeart Systems Modeler &mdash; Gene Bellinger&rsquo;s AI Systems Modeling Methodology</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${narrative.title.replace(/\s+/g, "-").toLowerCase()}-story.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [store.narrativeResult, store.narrativeMode, store.illustrationDataUrl, store.characterImages]);

  const handleExportJSON = useCallback(() => {
    if (!store.model) return;
    const blob = new Blob([JSON.stringify(store.model, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${store.model.name.replace(/\s+/g, "-").toLowerCase()}-model.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [store.model]);

  // Zoom controls from D3 component
  const getDiagramControls = useCallback(() => {
    const container = document.querySelector("[data-diagram='true']");
    return (container as HTMLDivElement & { __zoomControls?: { zoomIn: () => void; zoomOut: () => void; resetView: () => void } })?.__zoomControls;
  }, []);

  // ── Resizable chat panel ──
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(380);

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = store.chatPanelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [store.chatPanelWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: PointerEvent) => {
      const delta = resizeStartX.current - e.clientX;
      store.setChatPanelWidth(resizeStartWidth.current + delta);
    };
    const handleUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [isResizing, store]);

  // ── Render ──
  const showDiagram = store.phase !== "input" && store.model;
  const showNarrative = store.phase === "humanize" && store.narrativeResult;

  return (
    <div className="h-screen flex flex-col bg-[#1a2f22] text-white overflow-hidden dark">
      {/* Phase indicator */}
      <div className="flex-shrink-0 border-b border-[#2a4535] bg-[#1a2f22]/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = "/"}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <EcoheartLogo className="w-7 h-7" />
              <span className="text-[#3ddc84] font-bold text-lg tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>ecoheart</span>
            </button>
            <div className="w-px h-6 bg-[#2a4535]" />
            <span className="text-[#9ab8a2] text-sm">Systems Modeler</span>
          </div>
          <div className="flex items-center gap-2">
            <PhaseIndicator
              currentPhase={store.phase}
              onPhaseClick={(phase) => {
                if (phase === "input") store.setPhase("input");
                if (phase === "iterate" && store.model) store.setPhase("iterate");
              }}
            />
            <button
              onClick={() => store.setAboutOpen(true)}
              className="ml-2 px-3 py-1 text-xs border border-[#2a4535] text-[#9ab8a2] rounded-full hover:text-[#3ddc84] hover:border-[#3ddc84] transition-colors"
            >
              About
            </button>
            {store.model && (
              <button
                onClick={handleExportJSON}
                className="px-3 py-1 text-xs border border-[#2a9c5e] text-[#3ddc84] rounded-full hover:bg-[#3ddc84] hover:text-[#1a2f22] transition-colors"
              >
                Export JSON
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {store.error && (
        <div className="flex-shrink-0 px-4 py-2 bg-red-900/30 border-b border-red-800 text-red-300 text-sm flex items-center justify-between">
          <span>{store.error}</span>
          <button onClick={() => store.setError(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Diagram or Input */}
        <div className="flex-1 relative">
          {/* Progress overlay */}
          <ProgressOverlay
            isVisible={store.isLoading}
            message={store.progressMessage}
            percent={store.progressPercent}
          />

          {store.phase === "input" && (
            <div className="absolute inset-0 overflow-y-auto flex items-start justify-center py-8">
              <ModelInputForm
                onGenerate={handleGenerate}
                onImport={handleImport}
                onImportFallback={handleImportFallback}
                isLoading={store.isLoading}
              />
            </div>
          )}

          {/* Diagram — always mounted when model exists, hidden when narrative is shown */}
          {showDiagram && (
            <div className={showNarrative ? "hidden" : "absolute inset-0"}>
              <CausalLoopDiagram
                model={store.model!}
                highlightedNodeIds={store.highlightedNodeIds}
                highlightedLinkIndices={store.highlightedLinkIndices}
                activeFilters={store.activeFilters}
                forceActive={store.forceActive && !showNarrative}
                onNodeClick={(id) => store.selectNode(id)}
                onLoopClick={(id) => store.selectLoop(id)}
                onBackgroundClick={() => store.clearSelection()}
              />
            </div>
          )}

          {showDiagram && !showNarrative && (
            <>
              {/* Filter chips */}
              <div className="absolute left-4 top-4 flex flex-col gap-2 z-10">
                {(["reinforcing", "balancing", "nodes"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => store.toggleFilter(filter)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs backdrop-blur-sm transition-all ${
                      store.activeFilters[filter]
                        ? "border-current opacity-100"
                        : "border-[#2a4535] opacity-50"
                    }`}
                    style={{
                      color:
                        filter === "reinforcing"
                          ? "#e05c5c"
                          : filter === "balancing"
                            ? "#5ca8e0"
                            : "#3ddc84",
                      background: "rgba(13,26,18,0.8)",
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background:
                          filter === "reinforcing"
                            ? "#e05c5c"
                            : filter === "balancing"
                              ? "#5ca8e0"
                              : "#3ddc84",
                      }}
                    />
                    {filter === "reinforcing"
                      ? "Reinforcing loops"
                      : filter === "balancing"
                        ? "Balancing loops"
                        : "Variables"}
                  </button>
                ))}
              </div>

              {/* Toolbar */}
              <DiagramToolbar
                onZoomIn={() => getDiagramControls()?.zoomIn()}
                onZoomOut={() => getDiagramControls()?.zoomOut()}
                onResetView={() => getDiagramControls()?.resetView()}
                onToggleForce={() => store.toggleForce()}
                onOpenLoops={() => {
                  store.setSidePanelOpen(true);
                  store.selectNode(null);
                }}
                onUndo={() => store.undo()}
                forceActive={store.forceActive}
                canUndo={store.history.length > 0}
              />

              {/* Side panel */}
              <DiagramSidePanel
                isOpen={store.isSidePanelOpen}
                onClose={() => store.clearSelection()}
                model={store.model!}
                selectedNodeId={store.selectedNodeId || undefined}
                selectedLoopId={store.selectedLoopId || undefined}
              />

              {/* Chat toggle button (when chat is hidden) */}
              {!store.isChatOpen && (
                <button
                  onClick={() => store.setChatOpen(true)}
                  className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a4535] bg-[#213a2b]/90 backdrop-blur-sm text-[#9ab8a2] hover:text-[#3ddc84] hover:border-[#3ddc84] transition-colors"
                  title="Open AI chat"
                >
                  <PanelRightOpen className="w-4 h-4" />
                  <span className="text-xs font-medium">AI Chat</span>
                </button>
              )}

              {/* Phase action buttons */}
              <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={() => store.setPhase("collide")}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-lg"
                >
                  Aha! Paradox
                </button>
                <button
                  onClick={() => handleHumanize("story")}
                  disabled={store.isLoading}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {store.isLoading ? "Generating..." : "Model Story"}
                </button>
                <button
                  onClick={() => handleHumanize("professional")}
                  disabled={store.isLoading}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {store.isLoading ? "Generating..." : "Professional Report"}
                </button>
              </div>
            </>
          )}

          {showNarrative && (
            <div className="absolute inset-0 overflow-y-auto">
              <NarrativePanel
                narrative={store.narrativeResult}
                onGenerate={() => handleHumanize(store.narrativeMode)}
                isLoading={store.isLoading}
                illustrationDataUrl={store.illustrationDataUrl}
                onIllustrationGenerated={(dataUrl) => store.setIllustration(dataUrl)}
                characterImages={store.characterImages}
                mode={store.narrativeMode}
              />
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
                <button
                  onClick={() => store.setPhase("iterate")}
                  className="px-4 py-2 text-sm bg-[#213a2b] border border-[#2a4535] text-[#9ab8a2] rounded-full hover:text-[#3ddc84] hover:border-[#3ddc84] transition-colors backdrop-blur-sm"
                >
                  Back to Diagram
                </button>
                <button
                  onClick={handleExportStory}
                  className={`px-4 py-2 text-sm bg-[#213a2b] border rounded-full transition-colors backdrop-blur-sm ${
                    store.narrativeMode === "professional"
                      ? "border-blue-700/50 text-blue-400 hover:text-blue-300 hover:border-blue-500"
                      : "border-amber-700/50 text-amber-400 hover:text-amber-300 hover:border-amber-500"
                  }`}
                >
                  {store.narrativeMode === "professional" ? "Export Report" : "Export Story"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: CopilotKit Chat Panel (resizable) */}
        {showDiagram && !showNarrative && store.isChatOpen && (
          <div
            className="border-l border-[#2a4535] flex-shrink-0 hidden lg:flex flex-col bg-[#1a2f22] relative"
            style={{ width: store.chatPanelWidth }}
          >
            {/* Resize handle */}
            <div
              onPointerDown={handleResizePointerDown}
              className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-50 transition-colors ${
                isResizing ? "bg-[#3ddc84]/30" : "hover:bg-[#3ddc84]/20"
              }`}
            />
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a4535]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#3ddc84]" />
                <span className="text-sm font-medium text-[#d4e8d8]">Systems Modeler AI</span>
              </div>
              <button
                onClick={() => store.setChatOpen(false)}
                className="p-1 rounded hover:bg-[#2a4535] transition-colors"
                title="Hide chat panel"
              >
                <PanelRightClose className="w-4 h-4 text-[#9ab8a2]" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CopilotChat
                instructions={ITERATE_SYSTEM_PROMPT}
                labels={{
                  placeholder: "Refine the model... (e.g., 'Loop B2 is actually reinforcing')",
                  initial: "I can see the current system model. Ask me to add nodes, change relationships, reclassify loops, or explain any part of the diagram.",
                }}
                className="h-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Collision dialog */}
      <CollisionDialog
        isOpen={store.phase === "collide"}
        onClose={() => store.setPhase("iterate")}
        onCollide={handleCollide}
        isLoading={store.isLoading}
      />

      {/* About modal */}
      <SystemsModelerAboutModal
        isOpen={store.isAboutOpen}
        onClose={() => store.setAboutOpen(false)}
      />
    </div>
  );
}
