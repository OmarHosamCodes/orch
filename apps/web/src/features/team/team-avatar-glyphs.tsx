type MarkGlyphId = "beam" | "orbit" | "initial" | "question";

export function AgencyMarkGlyph({
  glyph,
  initial,
  className,
}: {
  glyph: MarkGlyphId;
  initial?: string;
  className?: string;
}) {
  const mark = initial?.trim().charAt(0).toUpperCase() || "?";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {glyph === "beam" ? (
        <>
          <rect width="48" height="48" fill="#27272a" />
          <path d="M0 48 48 10v38Z" fill="#3f3f46" />
          <circle cx="15" cy="14" r="4.5" fill="#e4e4e7" />
        </>
      ) : null}
      {glyph === "orbit" ? (
        <>
          <rect width="48" height="48" fill="#3f3fa3" />
          <ellipse
            cx="24"
            cy="26"
            rx="17"
            ry="6"
            fill="none"
            stroke="#b9b9f0"
            strokeWidth="3"
            transform="rotate(-18 24 26)"
          />
          <circle cx="24" cy="26" r="8.5" fill="#e6e6fa" />
          <circle cx="39" cy="21" r="2.5" fill="#ffffff" />
          <circle cx="12" cy="12" r="1.5" fill="#b9b9f0" opacity="0.7" />
        </>
      ) : null}
      {glyph === "initial" ? (
        <>
          <rect width="48" height="48" fill="#064e3b" />
          <path d="M0 48 48 10v38Z" fill="#047857" />
          <text
            x="24"
            y="32.5"
            textAnchor="middle"
            fontSize="26"
            fontWeight="600"
            fontFamily="inherit"
            fill="#d1fae5"
          >
            {mark}
          </text>
        </>
      ) : null}
      {glyph === "question" ? (
        <>
          <rect width="48" height="48" fill="#27272a" />
          <text
            x="24"
            y="33.5"
            textAnchor="middle"
            fontSize="28"
            fontWeight="600"
            fontFamily="inherit"
            fill="#a1a1aa"
          >
            ?
          </text>
        </>
      ) : null}
    </svg>
  );
}
