export function HeroMotionBackground() {
  return (
    <div className="hero-motion-background" aria-hidden="true">
      <div className="hero-ambient-glow hero-ambient-glow-primary" />
      <div className="hero-ambient-glow hero-ambient-glow-secondary" />
      <div className="hero-ambient-glow hero-ambient-glow-tertiary" />
      <div className="hero-scan-line" />
      <svg
        className="hero-geo-svg"
        viewBox="0 0 1440 680"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/*
          Arc paths replace circles. All arcs are explicitly cut from circles whose
          centers lie far off-screen lower-right (cx=2600–3200, cy=1400–1800), so
          their visible left-side segments fall in x=700–1440 — the right half of the
          viewport where the horizontal mask is 0.5–1.0, not the ~0.1 it was before.

          M <x> <y>  A <rx> <ry> 0 <large-arc> <sweep> <ex> <ey>
          large-arc=0  → short arc segment (18–27° of the full circle)
          sweep=0      → CCW (downward sweep on lower-right circles)
          sweep=1      → CW  (upward sweep on lower-left circles)

          Each path endpoint is verified to lie on the stated circle.
        */}

        {/* Primary sweep — three arcs descend upper-right → lower-center */}
        <g className="orbit-primary">
          {/* cx=2600 cy=1600 r=2100: x spans 1240→712 over y=0→680 */}
          <path d="M 1240 0 A 2100 2100 0 0 0 712 680"
            stroke="#116149" strokeOpacity="0.32" strokeWidth="2.2" fill="none" />
          {/* cx=2900 cy=1400 r=2200: x spans 1203→821 over y=0→680 */}
          <path d="M 1203 0 A 2200 2200 0 0 0 821 680"
            stroke="#116149" strokeOpacity="0.26" strokeWidth="1.8" fill="none" />
          {/* cx=3200 cy=1800 r=2600 (mint): x spans 1324→853 over y=0→680 */}
          <path d="M 1324 0 A 2600 2600 0 0 0 853 680"
            stroke="#79D8AF" strokeOpacity="0.28" strokeWidth="1.4" fill="none" />
        </g>

        {/* Secondary sweep — two arcs ascend lower-left → upper-right (counter-phase) */}
        <g className="orbit-secondary">
          {/* cx=-400 cy=1400 r=1800: x spans 731→1250 over y=0→680 (CW on lower-left circle) */}
          <path d="M 731 0 A 1800 1800 0 0 1 1250 680"
            stroke="#116149" strokeOpacity="0.24" strokeWidth="1.8" fill="none" />
          {/* cx=-600 cy=1600 r=2000: x spans 600→1176 over y=0→680 */}
          <path d="M 600 0 A 2000 2000 0 0 1 1176 680"
            stroke="#116149" strokeOpacity="0.18" strokeWidth="1.4" fill="none" />
        </g>

        {/* Accent — single dashed arc with stroke-dashoffset flow animation */}
        <g className="orbit-accent">
          {/* cx=2400 cy=1500 r=1900: x spans 1234→686 over y=0→680 */}
          <path className="orbit-dash-flow"
            d="M 1234 0 A 1900 1900 0 0 0 686 680"
            stroke="#79D8AF" strokeOpacity="0.22" strokeWidth="1.3" fill="none"
            strokeDasharray="200 680" />
        </g>

        {/* Pulse nodes — all in x=880–1220, right zone (mask ≥ 0.75) */}
        <circle cx="960"  cy="300" r="4"   fill="#116149" fillOpacity="0.52" className="hero-node-pulse" style={{ animationDelay: "0s" }} />
        <circle cx="1100" cy="180" r="3.5" fill="#79D8AF" fillOpacity="0.56" className="hero-node-pulse" style={{ animationDelay: "1.2s" }} />
        <circle cx="880"  cy="460" r="3"   fill="#116149" fillOpacity="0.46" className="hero-node-pulse" style={{ animationDelay: "2.4s" }} />
        <circle cx="1220" cy="380" r="4"   fill="#116149" fillOpacity="0.52" className="hero-node-pulse" style={{ animationDelay: "0.7s" }} />
        <circle cx="1060" cy="80"  r="3"   fill="#79D8AF" fillOpacity="0.48" className="hero-node-pulse" style={{ animationDelay: "1.9s" }} />
      </svg>
    </div>
  );
}
