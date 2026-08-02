"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Eye,
  Lightbulb,
  LoaderCircle,
  Lock,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateAndSaveGmbSuggestionsAction } from "@/features/businesses/server/gmb-actions";
import type {
  GmbImpactReport,
  GmbSuggestion,
} from "@/features/ai/server/gmb-suggestions";
import { cn } from "@/lib/utils";

const IMPACT_STYLES: Record<GmbSuggestion["impact"], string> = {
  high: "bg-amber-50 text-amber-800 ring-amber-200/80",
  medium: "bg-sky-50 text-sky-800 ring-sky-200/80",
  low: "bg-slate-100 text-slate-600 ring-slate-200/80",
};

const CATEGORY_LABELS: Record<GmbSuggestion["category"], string> = {
  profile_completeness: "Completeness",
  photos: "Photos",
  categories: "Categories",
  posts: "Posts",
  reviews: "Reviews",
  hours: "Hours",
  local_seo: "Local SEO",
  engagement: "Engagement",
};

type Phase = "idle" | "researching" | "revealing" | "done" | "error";

type AgentStatus = "queued" | "working" | "done";

type AgentDef = {
  id: string;
  name: string;
  role: string;
  Icon: typeof Search;
  color: string;
  actions: string[];
};

/** One orchestration mesh: profile tips + growth in the same run. */
function buildAgents(businessName: string): AgentDef[] {
  return [
    {
      id: "scout",
      name: "Web Scout",
      role: "Search & discovery",
      Icon: Search,
      color: "sky",
      actions: [
        `Searching web for “${businessName}”`,
        "Crawling Maps listing candidates",
        "Ranking place-match confidence",
      ],
    },
    {
      id: "locator",
      name: "Listing Locator",
      role: "GBP identity",
      Icon: MapPin,
      color: "blue",
      actions: [
        "Resolving Google Business Profile",
        "Validating address & category",
        "Locking primary place_id",
      ],
    },
    {
      id: "reader",
      name: "Profile Reader",
      role: "Completeness audit",
      Icon: Building2,
      color: "indigo",
      actions: [
        "Reading description & services",
        "Checking phone · hours · website",
        "Scoring missing fields",
      ],
    },
    {
      id: "media",
      name: "Media Scanner",
      role: "Photos & cover",
      Icon: Eye,
      color: "amber",
      actions: [
        "Inspecting gallery freshness",
        "Flagging weak cover image",
        "Noting photo gaps",
      ],
    },
    {
      id: "reviews",
      name: "Review Analyst",
      role: "Ratings & replies",
      Icon: Activity,
      color: "rose",
      actions: [
        "Sampling recent reviews",
        "Measuring owner reply rate",
        "Detecting sentiment themes",
      ],
    },
    {
      id: "growth",
      name: "Growth Forecaster",
      role: "Impact & % lift",
      Icon: TrendingUp,
      color: "emerald",
      actions: [
        "Projecting Maps discovery lift",
        "Estimating engagement growth",
        "Writing growth percentage cards",
      ],
    },
    {
      id: "orchestrator",
      name: "Orchestrator",
      role: "Merge final pack",
      Icon: Sparkles,
      color: "violet",
      actions: [
        "Fusing suggestions + growth",
        "Ranking improvement opportunities",
        "Assembling final results page",
      ],
    },
  ];
}

const AGENT_COLOR: Record<
  string,
  { ring: string; bg: string; text: string; dot: string; border: string }
> = {
  sky: {
    ring: "ring-sky-400/40",
    bg: "bg-sky-400/15",
    text: "text-sky-200",
    dot: "bg-sky-400",
    border: "border-sky-400/30",
  },
  blue: {
    ring: "ring-blue-400/40",
    bg: "bg-blue-400/15",
    text: "text-blue-200",
    dot: "bg-blue-400",
    border: "border-blue-400/30",
  },
  indigo: {
    ring: "ring-indigo-400/40",
    bg: "bg-indigo-400/15",
    text: "text-indigo-200",
    dot: "bg-indigo-400",
    border: "border-indigo-400/30",
  },
  amber: {
    ring: "ring-amber-400/40",
    bg: "bg-amber-400/15",
    text: "text-amber-200",
    dot: "bg-amber-400",
    border: "border-amber-400/30",
  },
  rose: {
    ring: "ring-rose-400/40",
    bg: "bg-rose-400/15",
    text: "text-rose-200",
    dot: "bg-rose-400",
    border: "border-rose-400/30",
  },
  violet: {
    ring: "ring-violet-400/40",
    bg: "bg-violet-400/15",
    text: "text-violet-200",
    dot: "bg-violet-400",
    border: "border-violet-400/30",
  },
  emerald: {
    ring: "ring-emerald-400/40",
    bg: "bg-emerald-400/15",
    text: "text-emerald-200",
    dot: "bg-emerald-400",
    border: "border-emerald-400/30",
  },
};

const DEMO_SUGGESTIONS = [
  {
    title: "Write a fuller business description",
    impact: "high" as const,
    category: "Completeness",
    detail:
      "Profiles with a clear, keyword-aware description rank better in local search.",
    action:
      "Add a 250–750 character description covering category, area, and standout services.",
  },
  {
    title: "Publish fresh photos weekly",
    impact: "high" as const,
    category: "Photos",
    detail:
      "Active photo updates correlate with higher engagement on Maps listings.",
    action:
      "Upload exterior, interior, team, and product photos; keep the cover image current.",
  },
  {
    title: "Respond to every recent review",
    impact: "high" as const,
    category: "Reviews",
    detail:
      "Owner replies show engagement and help future customers trust the business.",
    action:
      "Reply to new Google reviews within 48 hours with specific, professional responses.",
  },
];

export function GmbSuggestionsPanel({
  businessId,
  businessName,
  unlocked,
  planName,
  initialSuggestions = [],
  initialGeneratedAt = null,
  initialImpactReport = null,
}: {
  businessId: string;
  businessName: string;
  unlocked: boolean;
  planName: string;
  initialSuggestions?: GmbSuggestion[];
  initialGeneratedAt?: string | null;
  initialImpactReport?: GmbImpactReport | null;
}) {
  const [suggestions, setSuggestions] =
    useState<GmbSuggestion[]>(initialSuggestions);
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    initialGeneratedAt,
  );
  const [impactReport, setImpactReport] = useState<GmbImpactReport | null>(
    initialImpactReport,
  );
  const [phase, setPhase] = useState<Phase>(
    initialSuggestions.length ? "done" : "idle",
  );
  const [visibleCount, setVisibleCount] = useState(initialSuggestions.length);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(
    {},
  );
  const [agentActions, setAgentActions] = useState<Record<string, string>>({});
  const [eventFeed, setEventFeed] = useState<
    Array<{ id: string; agent: string; text: string; tone: "info" | "ok" }>
  >([]);
  const [orchestrationTick, setOrchestrationTick] = useState(0);

  const hasSuggestions = suggestions.length > 0;
  const isBusy = phase === "researching" || phase === "revealing";

  const activeAgents = useMemo(
    () => buildAgents(businessName),
    [businessName],
  );

  const specialistHref = useMemo(() => {
    const points = suggestions
      .slice(0, 8)
      .map((s, i) => `${i + 1}. ${s.title} (${s.impact} impact)`)
      .join("\n");
    const subject = encodeURIComponent(
      `Hire GMB specialist — ${businessName}`,
    );
    const body = encodeURIComponent(
      `Hi,\n\nI would like a GMB specialist to improve my Google Business Profile for "${businessName}" based on these ReviewFlow AI suggestions:\n\n${points || "(Generate suggestions first)"}\n\nPlease contact me with next steps.\n`,
    );
    const email =
      process.env.NEXT_PUBLIC_GMB_SPECIALIST_EMAIL ?? "support@reviewflow.app";
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }, [businessName, suggestions]);

  // Multi-agent orchestration timeline while researching.
  useEffect(() => {
    if (phase !== "researching") return;

    const agents = buildAgents(businessName);
    const initial: Record<string, AgentStatus> = {};
    const actions: Record<string, string> = {};
    for (const agent of agents) {
      initial[agent.id] = "queued";
      actions[agent.id] = "Waiting for orchestrator…";
    }
    setAgentStatuses(initial);
    setAgentActions(actions);
    setEventFeed([
      {
        id: "boot",
        agent: "Orchestrator",
        text: "Spinning up agent mesh…",
        tone: "info",
      },
    ]);
    setOrchestrationTick(0);

    let tick = 0;
    const maxTicks = agents.length * 3 + 2;
    const timer = window.setInterval(() => {
      tick += 1;
      setOrchestrationTick(tick);

      setAgentStatuses((prev) => {
        const next = { ...prev };
        agents.forEach((agent, index) => {
          const start = index; // staggered start
          const finish = start + 3;
          if (tick < start) next[agent.id] = "queued";
          else if (tick < finish) next[agent.id] = "working";
          else next[agent.id] = "done";
        });
        return next;
      });

      setAgentActions((prev) => {
        const next = { ...prev };
        agents.forEach((agent, index) => {
          const start = index;
          const finish = start + 3;
          if (tick < start) next[agent.id] = "Queued in orchestration graph";
          else if (tick < finish) {
            const actionIdx = Math.min(
              agent.actions.length - 1,
              tick - start,
            );
            next[agent.id] = agent.actions[actionIdx] ?? agent.actions[0]!;
          } else next[agent.id] = "Handed results to orchestrator";
        });
        return next;
      });

      const activeAgent = agents[Math.min(agents.length - 1, Math.floor(tick / 1.2))];
      if (activeAgent) {
        const actionIdx = Math.min(
          activeAgent.actions.length - 1,
          tick % activeAgent.actions.length,
        );
        setEventFeed((prev) => {
          const line = {
            id: `${activeAgent.id}-${tick}`,
            agent: activeAgent.name,
            text: activeAgent.actions[actionIdx]!,
            tone: "info" as const,
          };
          return [...prev, line].slice(-8);
        });
      }

      if (tick >= maxTicks) {
        setEventFeed((prev) =>
          [
            ...prev,
            {
              id: `final-${tick}`,
              agent: "Orchestrator",
              text: "All agents complete — assembling final page",
              tone: "ok" as const,
            },
          ].slice(-8),
        );
      }
    }, 900);

    return () => window.clearInterval(timer);
  }, [phase, businessName]);

  // Stream-reveal suggestion cards, then finish.
  useEffect(() => {
    if (phase !== "revealing" || !suggestions.length) return;
    setVisibleCount(0);
    let n = 0;
    const timer = window.setInterval(() => {
      n += 1;
      setVisibleCount(n);
      if (n >= suggestions.length) {
        window.clearInterval(timer);
        setPhase("done");
      }
    }, 420);
    return () => window.clearInterval(timer);
  }, [phase, suggestions.length]);

  async function onGenerate() {
    if (isBusy) return;
    setPhase("researching");
    setVisibleCount(0);
    try {
      const [result] = await Promise.all([
        generateAndSaveGmbSuggestionsAction({ businessId }),
        sleep(7800), // multi-agent orchestration (suggestions + growth together)
      ]);
      setSuggestions(result.suggestions);
      setGeneratedAt(result.generatedAt);
      setImpactReport(result.impactReport);
      setPhase("revealing");
      toast.success("Full analysis ready — suggestions and growth.");
    } catch (error) {
      setPhase("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate analysis.",
      );
    }
  }

  const doneAgents = activeAgents.filter(
    (a) => agentStatuses[a.id] === "done",
  ).length;
  const workingAgents = activeAgents.filter(
    (a) => agentStatuses[a.id] === "working",
  ).length;

  return (
    <section
      aria-labelledby="gmb-suggestions-heading"
      className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]"
    >
      <header className="flex flex-col gap-4 border-b border-border/60 bg-gradient-to-r from-primary/[0.06] via-muted/20 to-transparent px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary shadow-inner">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="gmb-suggestions-heading"
                className="text-base font-extrabold tracking-[-0.03em] text-foreground"
              >
                GMB profile suggestions
              </h2>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-secondary-foreground">
                AI
              </span>
              {unlocked && hasSuggestions ? (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-extrabold text-primary-foreground">
                  {suggestions.length}
                </span>
              ) : null}
              {!unlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-amber-800 ring-1 ring-amber-200/80">
                  <Lock className="h-3 w-3" aria-hidden="true" />
                  Growth &amp; Custom
                </span>
              ) : null}
            </div>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
              One multi-agent run for{" "}
              <span className="font-semibold text-foreground/90">
                {businessName}
              </span>
              : profile tips and growth projections together. Generated once —
              no regenerate.
            </p>
          </div>
        </div>
      </header>

      {/* Growth % cards — always top of content when ready */}
      {unlocked && impactReport?.metrics?.length ? (
        <GrowthCardsStrip report={impactReport} />
      ) : null}

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {!unlocked ? (
          <LockedPreview planName={planName} />
        ) : isBusy && phase !== "revealing" ? (
          <AgentOrchestrationTheater
            businessName={businessName}
            phase={phase}
            agents={activeAgents}
            statuses={agentStatuses}
            actions={agentActions}
            eventFeed={eventFeed}
            doneCount={doneAgents}
            workingCount={workingAgents}
            tick={orchestrationTick}
          />
        ) : !hasSuggestions ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-10 text-center">
            <Sparkles
              className="mx-auto h-8 w-8 text-primary/70"
              aria-hidden="true"
            />
            <p className="mt-3 text-base font-extrabold tracking-[-0.03em] text-foreground">
              Ready to deploy agents
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-6 text-muted-foreground">
              One run produces everything: profile suggestions and growth
              percentage cards. Agents search, audit, forecast, then stream the
              full results pack.
            </p>
            <Button type="button" onClick={() => void onGenerate()} className="mt-5">
              <Sparkles className="h-4 w-4" />
              Generate full analysis
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs font-semibold text-muted-foreground">
              {suggestions.length} suggestion
              {suggestions.length === 1 ? "" : "s"} saved
              {generatedAt
                ? ` · ${new Date(generatedAt).toLocaleString()}`
                : null}
              {" · "}
              Locked (no regenerate)
            </p>

            <ul className="space-y-3">
              {suggestions.slice(0, visibleCount).map((item, index) => (
                <li
                  key={item.id}
                  className="animate-fade-up rounded-xl border border-border/70 bg-white p-4 shadow-sm sm:p-5"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-extrabold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold tracking-[-0.02em] text-foreground sm:text-[15px]">
                          {item.title}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] ring-1",
                            IMPACT_STYLES[item.impact],
                          )}
                        >
                          {item.impact} impact
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium leading-6 text-muted-foreground">
                        {item.detail}
                      </p>
                      <p className="mt-2.5 rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2 text-sm font-semibold leading-5 text-foreground/90">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
                          Next step
                        </span>
                        <span className="mt-0.5 block">{item.action}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {visibleCount < suggestions.length ? (
              <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Streaming suggestions…
              </p>
            ) : null}

            {/* Hire specialist */}
            {phase === "done" || visibleCount >= suggestions.length ? (
              <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-base font-extrabold tracking-[-0.03em]">
                        Hire a GMB specialist
                      </p>
                      <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-white/70">
                        Get a specialist to implement these points on your
                        Google Business Profile—photos, categories, reviews,
                        posts, and completeness.
                      </p>
                    </div>
                  </div>
                  <Button
                    asChild
                    className="shrink-0 bg-white text-slate-900 hover:bg-white/90"
                  >
                    <a href={specialistHref}>
                      Request specialist
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Growth narrative (metrics already on top strip) */}
            {impactReport ? (
              <div className="rounded-2xl border border-border/70 bg-muted/15 p-5 sm:p-6">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700">
                    <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-base font-extrabold tracking-[-0.03em] text-foreground">
                      Growth outlook
                    </p>
                    <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
                      Included in the same analysis · percentages pinned above
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-5">
                  <p className="text-sm font-medium leading-6 text-foreground/90">
                    {impactReport.summary}
                  </p>
                  {impactReport.growthHighlights.length ? (
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                        Growth highlights
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {impactReport.growthHighlights.map((item) => (
                          <li
                            key={item}
                            className="flex gap-2 text-sm font-medium text-foreground/90"
                          >
                            <span className="text-emerald-600" aria-hidden>
                              ✓
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {impactReport.specialistFocus.length ? (
                    <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-primary">
                        Specialist would prioritize
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {impactReport.specialistFocus.map((item) => (
                          <li
                            key={item}
                            className="text-sm font-semibold text-foreground/90"
                          >
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function GrowthCardsStrip({ report }: { report: GmbImpactReport }) {
  return (
    <div className="border-b border-border/60 bg-gradient-to-b from-emerald-50/95 via-white to-white px-4 py-5 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-800/80">
          Projected improvement · {report.timeframe}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-emerald-800">
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
          Growth
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {report.metrics.slice(0, 4).map((metric, index) => (
          <div
            key={metric.label}
            className="animate-fade-up rounded-xl border border-emerald-100/80 bg-white px-3 py-3.5 text-center shadow-sm sm:px-4"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1.5 text-2xl font-extrabold tracking-[-0.05em] text-emerald-700 sm:text-3xl">
              {metric.change}
            </p>
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-4 text-muted-foreground">
              {metric.after}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentOrchestrationTheater({
  businessName,
  phase,
  agents,
  statuses,
  actions,
  eventFeed,
  doneCount,
  workingCount,
  tick,
}: {
  businessName: string;
  phase: Phase;
  agents: AgentDef[];
  statuses: Record<string, AgentStatus>;
  actions: Record<string, string>;
  eventFeed: Array<{ id: string; agent: string; text: string; tone: "info" | "ok" }>;
  doneCount: number;
  workingCount: number;
  tick: number;
}) {
  const total = agents.length || 1;
  const progress = Math.min(98, Math.round(((doneCount + workingCount * 0.45) / total) * 100));
  const allDone = doneCount >= total && total > 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050b18] p-4 text-white shadow-[0_20px_60px_rgba(2,8,23,0.45)] sm:p-6">
      {/* Background mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 40%), radial-gradient(circle at 80% 30%, rgba(129,140,248,0.16), transparent 42%), radial-gradient(circle at 50% 80%, rgba(52,211,153,0.12), transparent 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-300/90">
              Unified multi-agent analysis
            </p>
            <h3 className="mt-1 text-xl font-extrabold tracking-[-0.04em] sm:text-2xl">
              {allDone ? "Assembling final page" : `Working on ${businessName}`}
            </h3>
            <p className="mt-1.5 max-w-xl text-sm font-medium text-white/55">
              {allDone
                ? "Agents finished. Packaging profile suggestions and growth % cards together."
                : "One run: scouts, auditors, growth forecaster, and orchestrator build the full pack."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/80">
              <span className="relative flex h-2 w-2">
                <span className="agent-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {workingCount} active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/80">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              {doneCount}/{total} done
            </span>
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="agent-shimmer h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] font-semibold tabular-nums text-white/45">
          Orchestration progress {progress}% · tick {tick}
        </p>

        {/* Hub + agent cards */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {agents.map((agent) => {
              const status = statuses[agent.id] ?? "queued";
              const palette = AGENT_COLOR[agent.color] ?? AGENT_COLOR.sky!;
              const Icon = agent.Icon;
              return (
                <article
                  key={agent.id}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all duration-500",
                    palette.border,
                    status === "working" && "shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_12px_40px_rgba(14,165,233,0.12)]",
                    status === "done" && "opacity-95",
                    status === "queued" && "opacity-55",
                  )}
                >
                  {status === "working" ? (
                    <span
                      className={cn(
                        "agent-pulse-ring pointer-events-none absolute -right-2 -top-2 h-10 w-10 rounded-full",
                        palette.dot,
                        "opacity-30",
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "relative grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1",
                        palette.bg,
                        palette.text,
                        palette.ring,
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          status === "working" && "animate-pulse",
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-extrabold tracking-[-0.02em]">
                          {agent.name}
                        </p>
                        <StatusPill status={status} />
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/45">
                        {agent.role}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-white/70">
                        {actions[agent.id] ?? "…"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {agent.actions.map((_, i) => {
                      const filled =
                        status === "done" ||
                        (status === "working" &&
                          i <=
                            Math.max(
                              0,
                              agent.actions.findIndex(
                                (a) => a === actions[agent.id],
                              ),
                            ));
                      return (
                        <span
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-500",
                            filled ? palette.dot : "bg-white/10",
                          )}
                        />
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Orchestrator hub */}
          <div className="relative flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
            <div className="relative grid h-28 w-28 place-items-center">
              <div className="agent-orbit pointer-events-none absolute inset-0 rounded-full border border-dashed border-sky-400/30" />
              <div className="pointer-events-none absolute inset-2 rounded-full border border-violet-400/20" />
              <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-violet-500/30 ring-1 ring-white/20 shadow-[0_0_40px_rgba(56,189,248,0.25)]">
                <Sparkles className="h-7 w-7 text-sky-200" />
              </span>
              {workingCount > 0 ? (
                <span className="agent-beam pointer-events-none absolute -inset-3 rounded-full border border-sky-400/20" />
              ) : null}
            </div>
            <p className="mt-3 text-sm font-extrabold tracking-[-0.02em]">
              Orchestrator
            </p>
            <p className="mt-1 text-center text-[11px] font-medium leading-4 text-white/50">
              {allDone
                ? "Merging agent outputs into the final page"
                : "Routing tasks · collecting findings · keeping agents in sync"}
            </p>
            {allDone ? (
              <div className="mt-4 w-full rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-center text-[11px] font-bold text-emerald-200">
                Final assembly in progress…
              </div>
            ) : null}
          </div>
        </div>

        {/* Live event stream */}
        <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/40">
              Agent event stream
            </p>
            <ul className="mt-2 max-h-40 space-y-1.5 overflow-hidden font-mono text-[11px] leading-5">
              {eventFeed.length ? (
                eventFeed.map((event) => (
                  <li
                    key={event.id}
                    className={cn(
                      "truncate rounded-lg px-2 py-1",
                      event.tone === "ok"
                        ? "bg-emerald-400/10 text-emerald-200"
                        : "text-sky-100/90",
                    )}
                  >
                    <span className="font-bold text-white/50">
                      [{event.agent}]
                    </span>{" "}
                    {event.text}
                  </li>
                ))
              ) : (
                <li className="text-white/35">booting agent mesh…</li>
              )}
              <li className="animate-pulse text-sky-300/70">▌</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/40">
              Pipeline stages
            </p>
            <ol className="mt-3 space-y-2">
              {[
                "Discover listing",
                "Scrape profile",
                "Parallel analysis",
                "Forecast growth",
                "Final page",
              ].map((stage, index, arr) => {
                const stageProgress = progress / 100;
                const threshold = (index + 1) / arr.length;
                const done = stageProgress >= threshold;
                const active =
                  stageProgress >= index / arr.length && !done;
                return (
                  <li key={stage} className="flex items-center gap-2 text-xs font-semibold">
                    <span
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded-full text-[10px]",
                        done
                          ? "bg-emerald-400/20 text-emerald-300"
                          : active
                            ? "bg-sky-400/20 text-sky-200"
                            : "bg-white/5 text-white/30",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : active ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={cn(
                        done
                          ? "text-emerald-200"
                          : active
                            ? "text-white"
                            : "text-white/35",
                      )}
                    >
                      {stage}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: AgentStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-300">
        Done
      </span>
    );
  }
  if (status === "working") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-sky-200">
        <LoaderCircle className="h-3 w-3 animate-spin" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/45">
      Queued
    </span>
  );
}

function LockedPreview({ planName }: { planName: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted/10">
      <ul
        className="pointer-events-none select-none space-y-3 p-4 blur-[5px] sm:p-5"
        aria-hidden="true"
      >
        {DEMO_SUGGESTIONS.map((item, index) => (
          <li
            key={item.title}
            className="rounded-xl border border-border/70 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-extrabold text-muted-foreground">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/35 via-white/75 to-white/92 p-5 backdrop-blur-[1px]">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-white/95 p-6 text-center shadow-[0_16px_40px_rgba(15,23,42,0.12)] sm:p-7">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-extrabold tracking-[-0.03em] text-foreground">
            Unlock GMB AI suggestions
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
            Your plan is{" "}
            <span className="font-bold text-foreground">{planName}</span>.
            Upgrade to Growth or Custom for live research, streamed suggestions,
            and growth % cards.
          </p>
          <Button asChild className="mt-5">
            <Link href="/dashboard/billing">
              Upgrade plan
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
