"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ArrowUp, Check } from "@/components/icons";

const FOLLOW_UP_LINES = ["Taking that into the workflow.", "The update is in place."];

const motion = `
@keyframes panel-shine {
  from { background-position: 100% center; }
  to { background-position: 0% center; }
}
.panel-shine {
  background-image: linear-gradient(
    90deg,
    var(--grey-fg-secondary) 0%,
    var(--grey-fg-secondary) 36%,
    #c8c2bd 50%,
    var(--grey-fg-secondary) 64%,
    var(--grey-fg-secondary) 100%
  );
  background-size: 220% 100%;
  background-repeat: no-repeat;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation: panel-shine 1.8s cubic-bezier(0.4, 0, 0.2, 1) 1 both;
}
@keyframes panel-check-in {
  from { opacity: 0; transform: scale(0.7); }
  to { opacity: 1; transform: none; }
}
.panel-check-in { animation: panel-check-in 280ms cubic-bezier(0.22, 1, 0.36, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .panel-shine { animation: none; color: var(--grey-fg-secondary); background: none; }
  .panel-check-in { animation: none; }
}
`;

type TextBlock = { key: string; role: "prompt" | "user"; kind: "text"; text: string };
type StepBlock = { key: string; kind: "steps"; lines: string[]; settled: number; report: boolean };
type Block = TextBlock | StepBlock;

export function AssistantThread({
  prompt,
  lines,
  onDone,
}: {
  prompt: string;
  lines: string[];
  onDone: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([
    { key: "prompt", role: "prompt", kind: "text", text: prompt },
    { key: "build", kind: "steps", lines, settled: 0, report: true },
  ]);
  const [draft, setDraft] = useState("");
  const [ready, setReady] = useState(false);
  const [played, setPlayed] = useState<ReadonlySet<string>>(() => new Set());
  const reported = useRef(false);
  const onDoneRef = useRef(onDone);
  const scroller = useRef<HTMLDivElement>(null);
  onDoneRef.current = onDone;

  const working = blocks.some((block) => block.kind === "steps" && block.settled < block.lines.length);
  const busy = working || !ready;

  useEffect(() => {
    const block = blocks.find((item) => item.kind === "steps" && item.settled < item.lines.length);
    if (!block || block.kind !== "steps") return;
    const expected = block.settled;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setBlocks((current) =>
        current.map((item) => {
          if (item.kind !== "steps" || item.key !== block.key || item.settled !== expected) return item;
          return { ...item, settled: item.settled + 1 };
        }),
      );
    }, reduced ? 180 : 2200);
    return () => window.clearTimeout(timer);
  }, [blocks]);

  useEffect(() => {
    const build = blocks.find((item) => item.kind === "steps" && item.report);
    if (!build || build.kind !== "steps" || build.settled < build.lines.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      setReady(true);
      if (reported.current) return;
      reported.current = true;
      onDoneRef.current();
    }, reduced ? 160 : 900);
    return () => window.clearTimeout(timer);
  }, [blocks]);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [blocks]);

  function markPlayed(id: string) {
    setPlayed((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }

  function finishStep(key: string, index: number) {
    setBlocks((current) =>
      current.map((item) => {
        if (item.kind !== "steps" || item.key !== key || item.settled !== index) return item;
        return { ...item, settled: item.settled + 1 };
      }),
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setBlocks((current) => [
      ...current,
      { key: crypto.randomUUID(), role: "user", kind: "text", text },
      { key: crypto.randomUUID(), kind: "steps", lines: FOLLOW_UP_LINES, settled: 0, report: false },
    ]);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <style>{motion}</style>
      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {blocks.map((block) =>
          block.kind === "text" ? (
            <div key={block.key} className="flex justify-end">
              <p className="max-w-[85%] rounded-[12px] rounded-br-[4px] bg-[var(--grey-bg-2,#f8f7f7)] px-3 py-2 text-[length:var(--text-regular-base-size)] leading-[var(--text-regular-base-leading)] tracking-[var(--text-regular-base-tracking)] text-fg-primary">
                {block.text}
              </p>
            </div>
          ) : (
            <div key={block.key} className="flex flex-col gap-2">
              {block.lines.slice(0, block.settled + (block.settled < block.lines.length ? 1 : 0)).map((line, index) => {
                const settled = index < block.settled;
                const lineId = `${block.key}:${index}`;
                const shine = !settled && !played.has(lineId);
                const checkId = `${lineId}:check`;
                const revealCheck = settled && !played.has(checkId);
                return (
                  <div key={`${block.key}-${line}`} className="flex items-start gap-1.5">
                    <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center text-fg-secondary">
                      {settled ? (
                        <span className={revealCheck ? "panel-check-in flex" : "flex"} onAnimationEnd={() => markPlayed(checkId)}>
                          <Check />
                        </span>
                      ) : null}
                    </span>
                    <p
                      onAnimationEnd={shine ? () => {
                        markPlayed(lineId);
                        finishStep(block.key, index);
                      } : undefined}
                      className={`text-[length:var(--text-regular-base-size)] leading-[var(--text-regular-base-leading)] tracking-[var(--text-regular-base-tracking)] ${shine ? "panel-shine" : "text-fg-secondary"}`}
                    >
                      {line}
                    </p>
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>
      <form onSubmit={submit} className="shrink-0 px-3 pb-3">
        <div className="flex h-[100px] w-full flex-col items-end justify-end gap-2 rounded-[12px] border-[0.5px] border-solid border-bo-3 bg-su-light-elevation p-3 shadow-[0_-8px_12px_-4px_rgba(28,25,23,0.02)]">
          <textarea
            value={draft}
            disabled={busy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask for a change..."
            aria-label="Ask for a change"
            rows={2}
            className="min-h-0 w-full flex-1 resize-none overflow-y-auto bg-transparent text-[14px] leading-5 font-normal tracking-[-0.015em] text-fg-primary outline-none placeholder:text-[var(--grey-fg-tertiary)] disabled:cursor-not-allowed"
          />
          <Button
            kind="icon"
            tone="blue"
            type="submit"
            aria-label="Send"
            disabled={busy || !draft.trim()}
            className="!size-6"
          >
            <ArrowUp />
          </Button>
        </div>
      </form>
    </div>
  );
}
