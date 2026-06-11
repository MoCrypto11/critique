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
        {/* Primary arc rings — center at (1260, -140).
            Three concentric rings sweep dramatically across the full hero width. */}
        <g className="hero-arc-rings">
          <circle cx="1260" cy="-140" r="860" stroke="#116149" strokeOpacity="0.36" strokeWidth="2.5" />
          <circle cx="1260" cy="-140" r="630" stroke="#116149" strokeOpacity="0.28" strokeWidth="2.0" />
          <circle cx="1260" cy="-140" r="430" stroke="#79D8AF" strokeOpacity="0.42" strokeWidth="1.6" />
        </g>

        {/* Secondary arc pair — enter from lower-left, create bilateral depth */}
        <g className="hero-arc-rings-secondary">
          <circle cx="-60" cy="820" r="760" stroke="#116149" strokeOpacity="0.16" strokeWidth="1.5" />
          <circle cx="-60" cy="820" r="550" stroke="#116149" strokeOpacity="0.12" strokeWidth="1.1" />
        </g>

        {/* Main diagonal — spans full hero width */}
        <line x1="0" y1="560" x2="760" y2="0" stroke="#116149" strokeOpacity="0.22" strokeWidth="1.5" />

        {/* Horizontal mid-line, left section */}
        <line x1="0" y1="340" x2="640" y2="340" stroke="#116149" strokeOpacity="0.18" strokeWidth="1.3" />

        {/* Short vertical accent at diagonal intersection */}
        <line x1="480" y1="0" x2="480" y2="260" stroke="#116149" strokeOpacity="0.16" strokeWidth="1.1" />

        {/* Technical stepped connector — centre zone creates depth between arc layers */}
        <line x1="316" y1="246" x2="520" y2="246" stroke="#116149" strokeOpacity="0.30" strokeWidth="1.6" strokeLinecap="square" />
        <line x1="520" y1="246" x2="520" y2="342" stroke="#116149" strokeOpacity="0.24" strokeWidth="1.3" strokeLinecap="square" />
        <line x1="520" y1="342" x2="724" y2="342" stroke="#116149" strokeOpacity="0.28" strokeWidth="1.5" strokeLinecap="square" />
        <line x1="724" y1="342" x2="724" y2="428" stroke="#116149" strokeOpacity="0.20" strokeWidth="1.2" strokeLinecap="square" />

        {/* Pulse nodes — 7 total, staggered, spread across full band width */}
        <circle cx="480" cy="340" r="5.5" fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "0s" }} />
        <circle cx="520" cy="246" r="4.5" fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "0.8s" }} />
        <circle cx="520" cy="342" r="4.5" fill="#79D8AF" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "1.6s" }} />
        <circle cx="724" cy="342" r="4"   fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "2.2s" }} />
        <circle cx="724" cy="428" r="3.5" fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "0.4s" }} />
        <circle cx="316" cy="246" r="3"   fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "1.2s" }} />
        <circle cx="760" cy="2"   r="3"   fill="#79D8AF" fillOpacity="0.55" className="hero-node-pulse" style={{ animationDelay: "2.8s" }} />
      </svg>
    </div>
  );
}
