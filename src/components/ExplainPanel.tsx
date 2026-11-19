import { useRef, useState } from "react";
import { AlertTriangle, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import type { CheckResult } from "../types";
import { buildExplainRequest, MAX_QUESTION } from "../explain/contract";
import { createMockAdapter, MOCK_BEHAVIOURS, type MockBehaviour } from "../explain/adapters";
import { explainAvailability, type ExplainOutcome, type FallbackCause } from "../explain/service";

const CAUSE_LABEL: Record<FallbackCause, string> = {
  timeout: "the AI service timed out",
  "api-error": "the AI service returned an error",
  "no-key": "the AI service is not configured",
  "invalid-output": "the AI answer failed validation and was discarded",
};

interface Props {
  result: CheckResult;
}

/**
 * Optional "Explain availability" feature. Reads the deterministic result;
 * it has no way to change the decision or the bookings.
 */
export function ExplainPanel({ result }: Props) {
  const [behaviour, setBehaviour] = useState<MockBehaviour>("normal");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<ExplainOutcome | null>(null);
  const requestSeq = useRef(0);

  const handleExplain = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setOutcome(null);
    const request = buildExplainRequest(result, question);
    const next = await explainAvailability(request, createMockAdapter(behaviour));
    if (seq !== requestSeq.current) return; // a newer request superseded this one
    setOutcome(next);
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-900">
          <Sparkles className="h-4 w-4 text-violet-600" />
          Explain availability (optional)
        </h3>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
          MOCK AI · no real API call
        </span>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="explain-question">
        Your question (optional, max {MAX_QUESTION} characters)
      </label>
      <textarea
        id="explain-question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        placeholder="e.g. Why can't I use this room?"
        className="mb-1 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <p className={`mb-3 text-right text-[11px] ${question.trim().length > MAX_QUESTION ? "text-red-600" : "text-slate-400"}`}>
        {question.trim().length}/{MAX_QUESTION}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          onClick={handleExplain}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Explaining…" : "Explain availability"}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          Demo: simulate
          <select
            value={behaviour}
            onChange={(e) => setBehaviour(e.target.value as MockBehaviour)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          >
            {MOCK_BEHAVIOURS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {outcome?.kind === "generated" && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4" data-testid="explain-generated">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
            <Sparkles className="h-3.5 w-3.5" /> AI-generated explanation · {outcome.isMock ? "mock" : "live"} ·{" "}
            {outcome.latencyMs} ms
          </p>
          <p className="text-sm italic text-slate-700">{outcome.explanation}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            Generated text may be imperfect. The confirmed status is the coloured result card above.
          </p>
        </div>
      )}

      {outcome?.kind === "fallback" && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="explain-fallback">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Standard explanation (AI unavailable)
          </p>
          <p className="text-sm text-slate-700">{outcome.explanation}</p>
          <p className="mt-2 text-[11px] text-amber-700">
            Shown because {CAUSE_LABEL[outcome.cause]}. The booking decision is unchanged.
          </p>
        </div>
      )}

      {outcome?.kind === "rejected" && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="explain-rejected">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Cannot explain: {outcome.error}
        </p>
      )}
    </div>
  );
}
