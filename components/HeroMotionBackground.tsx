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
          Primary layer — three concentric circles at (1280, -80).
          Group translates 300px left-right over 20s: visible sweep of ~75px in 5s.
          High stroke opacities so arcs read on cream background.
        */}
        <g className="orbit-primary">
          <circle cx="1280" cy="-80" r="820" stroke="#116149" strokeOpacity="0.36" strokeWidth="2.2" />
          <circle cx="1280" cy="-80" r="580" stroke="#116149" strokeOpacity="0.28" strokeWidth="1.8" />
          <circle cx="1280" cy="-80" r="370" stroke="#79D8AF" strokeOpacity="0.32" strokeWidth="1.4" />
        </g>

        {/*
          Secondary layer — circles at (-40, 800), counter-sweeping.
          Translates 240px over 28s: ~43px shift in 5s.
        */}
        <g className="orbit-secondary">
          <circle cx="-40"  cy="800" r="920" stroke="#116149" strokeOpacity="0.26" strokeWidth="1.8" />
          <circle cx="-40"  cy="800" r="660" stroke="#116149" strokeOpacity="0.20" strokeWidth="1.4" />
        </g>

        {/*
          Accent layer — dashed circles at (1400, 200), phase-offset.
          Translates 200px over 24s: ~42px in 5s.
        */}
        <g className="orbit-accent">
          <circle cx="1400" cy="200" r="700" stroke="#79D8AF" strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="6 22" />
          <circle cx="1400" cy="200" r="490" stroke="#116149" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="4 26" />
        </g>

        {/* Pulse nodes — right 60–85% zone where left-mask is 0.75–1.0 */}
        <circle cx="960"  cy="300" r="4"   fill="#116149" fillOpacity="0.52" className="hero-node-pulse" style={{ animationDelay: "0s" }} />
        <circle cx="1100" cy="180" r="3.5" fill="#79D8AF" fillOpacity="0.56" className="hero-node-pulse" style={{ animationDelay: "1.2s" }} />
        <circle cx="880"  cy="460" r="3"   fill="#116149" fillOpacity="0.46" className="hero-node-pulse" style={{ animationDelay: "2.4s" }} />
        <circle cx="1220" cy="380" r="4"   fill="#116149" fillOpacity="0.52" className="hero-node-pulse" style={{ animationDelay: "0.7s" }} />
        <circle cx="1060" cy="80"  r="3"   fill="#79D8AF" fillOpacity="0.48" className="hero-node-pulse" style={{ animationDelay: "1.9s" }} />
      </svg>
    </div>
  );
}
