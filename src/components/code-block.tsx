import { TOKEN_CLASS, tokenizeLine } from "@/lib/highlight";

/** Read-only code with line numbers. Pass `active` to highlight lines. */
export function CodeBlock({ code, active = [] }: { code: string; active?: number[] }) {
  const lines = code.split("\n");
  return (
    <pre className="overflow-x-auto py-3.5 font-mono text-sm leading-[1.9]">
      <code>
        {lines.map((line, i) => {
          const on = active.includes(i + 1);
          return (
            <div
              key={i}
              className={`flex min-h-[27px] whitespace-pre pr-4 ${on ? "bg-lime/10 shadow-[inset_3px_0_0_var(--color-lime)]" : ""}`}
            >
              <span className={`w-11 flex-none select-none pr-4 text-right ${on ? "text-lime" : "text-faint"}`}>
                {i + 1}
              </span>
              <span>
                {tokenizeLine(line).map((t, j) => (
                  <span key={j} className={TOKEN_CLASS[t.kind]}>
                    {t.text}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}
