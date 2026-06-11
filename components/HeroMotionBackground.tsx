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
          Primary orbital layer — 3 concentric circles centered at (1280, -80).
          Group rotates around focal point at 84%×18% of viewBox = (1210, 122).
          Distance from focal point to circle center ≈ 214px → center sweeps ~177px in 5s.
        */}
        <g className="orbit-primary">
          <circle cx="1280" cy="-80" r="820" stroke="#116149" strokeOpacity="0.20" strokeWidth="2.0" />
          <circle cx="1280" cy="-80" r="580" stroke="#116149" strokeOpacity="0.16" strokeWidth="1.5" />
          <circle cx="1280" cy="-80" r="370" stroke="#79D8AF" strokeOpacity="0.18" strokeWidth="1.2" />
        </g>

        {/*
          Secondary orbital layer — larger, slower, counter-rotating.
          Circles centered at (-40, 800); focal point 12%×88% = (173, 598).
          Distance ≈ 294px → center sweeps ~164px in 5s at 56s period.
        */}
        <g className="orbit-secondary">
          <circle cx="-40" cy="800" r="900"  stroke="#116149" strokeOpacity="0.13" strokeWidth="1.4" />
          <circle cx="-40" cy="800" r="650"  stroke="#116149" strokeOpacity="0.10" strokeWidth="1.0" />
        </g>

        {/*
          Accent orbital — thin dashed strokes, distinct focal point.
          Circles centered at (1400, 200); focal point 72%×52% = (1037, 354).
          Distance ≈ 394px → fastest visible sweep, ~258px in 5s at 48s period.
        */}
        <g className="orbit-accent">
          <circle cx="1400" cy="200" r="680" stroke="#79D8AF" strokeOpacity="0.15" strokeWidth="1.0" strokeDasharray="5 20" />
          <circle cx="1400" cy="200" r="480" stroke="#116149" strokeOpacity="0.12" strokeWidth="1.0" strokeDasharray="3 24" />
        </g>

        {/* Pulse nodes — positioned in the right 40-85% zone where mask is 0.65–1.0 */}
        <circle cx="960"  cy="300" r="4"   fill="#116149" fillOpacity="0.46" className="hero-node-pulse" style={{ animationDelay: "0s" }} />
        <circle cx="1100" cy="180" r="3.5" fill="#79D8AF" fillOpacity="0.50" className="hero-node-pulse" style={{ animationDelay: "1.2s" }} />
        <circle cx="880"  cy="460" r="3"   fill="#116149" fillOpacity="0.40" className="hero-node-pulse" style={{ animationDelay: "2.4s" }} />
        <circle cx="1220" cy="380" r="4"   fill="#116149" fillOpacity="0.46" className="hero-node-pulse" style={{ animationDelay: "0.7s" }} />
        <circle cx="1060" cy="80"  r="3"   fill="#79D8AF" fillOpacity="0.42" className="hero-node-pulse" style={{ animationDelay: "1.9s" }} />
      </svg>
    </div>
  );
}
