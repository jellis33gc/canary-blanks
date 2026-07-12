// src/components/marketing/FlowBuilder.jsx
//
// Admin-only. Manages the two built-in flows - "welcome_series" (triggered by
// subscribeNewsletter) and "abandoned_cart" (triggered by detectAbandonedCarts) - and
// their ordered FlowStep emails. Auto-creates the EmailFlow records on first load.

import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const FLOW_DEFS = [
  {
    key: "welcome_series",
    name: "Welcome Series",
    description: "Sent after someone signs up for the newsletter. Step 1 (delay 0) carries the signup discount.",
  },
  {
    key: "abandoned_cart",
    name: "Abandoned Cart Recovery",
    description: "Sent after a cart goes quiet for MarketingSettings.abandoned_cart_inactivity_hours.",
  },
];

const emptyStep = { step_order: 1, delay_hours: 0, subject: "", html_body: "", is_active: true };

export default function FlowBuilder() {
  const [flows, setFlows] = useState({});
  const [steps, setSteps] = useState({});
  const [activeKey, setActiveKey] = useState("welcome_series");
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const flowMap = {};
    const stepMap = {};
    for (const def of FLOW_DEFS) {
      let existing = (await base44.entities.EmailFlow.filter({ key: def.key }))[0];
      if (!existing) {
        existing = await base44.entities.EmailFlow.create({ key: def.key, name: def.name, is_active: true });
      }
      flowMap[def.key] = existing;
      const flowSteps = await base44.entities.FlowStep.filter({ flow_id: existing.id }, "step_order");
      stepMap[def.key] = flowSteps;
    }
    setFlows(flowMap);
    setSteps(stepMap);
    setLoading(false);
  }

  async function toggleFlowActive(key) {
    const flow = flows[key];
    const updated = await base44.entities.EmailFlow.update(flow.id, { is_active: !flow.is_active });
    setFlows((f) => ({ ...f, [key]: updated }));
  }

  function startNewStep() {
    const existingSteps = steps[activeKey] || [];
    setEditingStep({ ...emptyStep, step_order: existingSteps.length + 1, flow_id: flows[activeKey].id });
  }

  async function saveStep() {
    if (editingStep.id) {
      await base44.entities.FlowStep.update(editingStep.id, editingStep);
    } else {
      await base44.entities.FlowStep.create(editingStep);
    }
    setEditingStep(null);
    load();
  }

  async function deleteStep(id) {
    if (!confirm("Delete this step?")) return;
    await base44.entities.FlowStep.delete(id);
    load();
  }

  if (loading) return <p className="text-muted-foreground">Loading flows...</p>;

  const flow = flows[activeKey];
  const flowSteps = steps[activeKey] || [];
  const def = FLOW_DEFS.find((d) => d.key === activeKey);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {FLOW_DEFS.map((d) => (
          <button
            key={d.key}
            onClick={() => setActiveKey(d.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              activeKey === d.key ? "bg-primary text-white" : "bg-muted text-foreground"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{def.description}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!flow?.is_active} onChange={() => toggleFlowActive(activeKey)} />
          Flow active
        </label>
      </div>

      <div className="space-y-2">
        {flowSteps.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            No steps yet.{" "}
            {activeKey === "welcome_series"
              ? "Without a step 1, new subscribers still get a default discount email built from Marketing Settings."
              : "Without step 1, abandoned carts are detected but no recovery email is sent."}
          </p>
        ) : (
          flowSteps.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="font-medium text-foreground">
                  Step {s.step_order}: {s.subject}{" "}
                  {!s.is_active && <span className="text-xs text-muted-foreground">(inactive)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.delay_hours === 0 ? "Sent immediately" : `Sent ${s.delay_hours}h after previous step`}
                </p>
              </div>
              <div className="flex gap-3 text-xs">
                <button className="text-foreground hover:underline" onClick={() => setEditingStep(s)}>
                  Edit
                </button>
                <button className="text-red-500 hover:underline" onClick={() => deleteStep(s.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button onClick={startNewStep} className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
        + Add step
      </button>

      {editingStep && (
        <div className="mt-4 rounded-md border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-foreground">Step order</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                value={editingStep.step_order}
                onChange={(e) => setEditingStep({ ...editingStep, step_order: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-foreground">Delay (hours after previous step)</span>
              <input
                type="number"
                min={0}
                step="0.5"
                className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
                value={editingStep.delay_hours}
                onChange={(e) => setEditingStep({ ...editingStep, delay_hours: Number(e.target.value) })}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-foreground">Subject</span>
            <input
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
              value={editingStep.subject}
              onChange={(e) => setEditingStep({ ...editingStep, subject: e.target.value })}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium text-foreground">
              HTML body (merge tags: {"{{first_name}}"}, {"{{discount_code}}"}, {"{{unsubscribe_url}}"}
              {activeKey === "abandoned_cart" ? `, {{checkout_url}}, {{cart_items_html}}` : ""})
            </span>
            <textarea
              rows={10}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 font-mono text-xs"
              value={editingStep.html_body}
              onChange={(e) => setEditingStep({ ...editingStep, html_body: e.target.value })}
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editingStep.is_active}
              onChange={(e) => setEditingStep({ ...editingStep, is_active: e.target.checked })}
            />
            Active
          </label>
          <div className="mt-3 flex gap-2">
            <button
              onClick={saveStep}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Save step
            </button>
            <button
              onClick={() => setEditingStep(null)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
