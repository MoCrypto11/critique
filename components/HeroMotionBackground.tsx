export function HeroMotionBackground() {
  return (
    <div className="hero-motion-background" aria-hidden="true">
      <div className="hero-ambient-glow hero-ambient-glow-primary" />
      <div className="hero-ambient-glow hero-ambient-glow-secondary" />
      <div className="hero-scan-line" />
      <svg
        className="hero-geo-svg"
        viewBox="0 0 1440 580"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Concentric arc rings — center anchored above-right at (1180, -60).
            Creates three sweeping arcs that cross the full hero width. */}
        <g className="hero-arc-rings">
          <circle cx="1180" cy="-60" r="700" stroke="#116149" strokeOpacity="0.38" strokeWidth="2.4" />
          <circle cx="1180" cy="-60" r="500" stroke="#116149" strokeOpacity="0.30" strokeWidth="1.9" />
          <circle cx="1180" cy="-60" r="330" stroke="#79D8AF" strokeOpacity="0.44" strokeWidth="1.5" />
        </g>

        {/* Diagonal reference line spanning full hero */}
        <line x1="175" y1="510" x2="640" y2="72" stroke="#116149" strokeOpacity="0.24" strokeWidth="1.4" />

        {/* Horizontal mid-line behind text column */}
        <line x1="0" y1="286" x2="540" y2="286" stroke="#116149" strokeOpacity="0.20" strokeWidth="1.3" />

        {/* Short vertical accent */}
        <line x1="442" y1="0" x2="442" y2="220" stroke="#116149" strokeOpacity="0.18" strokeWidth="1.1" />

        {/* Technical connector grid — column-transition zone */}
        <line x1="298" y1="216" x2="462" y2="216" stroke="#116149" strokeOpacity="0.32" strokeWidth="1.6" strokeLinecap="square" />
        <line x1="462" y1="216" x2="462" y2="288" stroke="#116149" strokeOpacity="0.26" strokeWidth="1.3" strokeLinecap="square" />
        <line x1="462" y1="288" x2="626" y2="288" stroke="#116149" strokeOpacity="0.30" strokeWidth="1.5" strokeLinecap="square" />

        {/* Pulse nodes — staggered animation delays */}
        <circle cx="442" cy="286" r="5"   fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "0s" }} />
        <circle cx="462" cy="216" r="4"   fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "0.9s" }} />
        <circle cx="462" cy="288" r="4"   fill="#79D8AF" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "1.8s" }} />
        <circle cx="626" cy="288" r="3.5" fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "2.4s" }} />
        <circle cx="298" cy="216" r="3"   fill="#116149" fillOpacity="0.65" className="hero-node-pulse" style={{ animationDelay: "0.4s" }} />
      </svg>
    </div>
  );
}
