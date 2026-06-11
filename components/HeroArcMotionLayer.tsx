export function HeroArcMotionLayer() {
  return (
    <div className="hero-arc-motion-layer" aria-hidden="true">
      {/* CSS blur glow — guaranteed visible, no SVG gradient dependency */}
      <div className="hero-arc-glow" />

      <svg
        className="hero-arc-motion-svg"
        viewBox="0 0 1800 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/*
          Primary group — 3 large Bézier curves.
          Paths span viewBox x = -300 to 2180 (oversized by design).
          The visible right-zone portions (x > 800 viewBox ≈ x > 640 screen)
          are in the mask's high-opacity region so translate motion is fully
          visible. CSS animation drives the translate on .arc-sweep-primary.
        */}
        <g className="arc-sweep-primary">
          {/* Signature sweep: lower-left → upper-right */}
          <path
            d="M -300 900 C 250 560 700 360 1220 280 C 1540 220 1780 180 2120 90"
            stroke="#116149"
            strokeOpacity="0.44"
            strokeWidth="2.0"
          />
          {/* Counter-arc: above viewport sweeping down-right */}
          <path
            d="M 220 -100 C 580 280 900 460 1360 555 C 1640 615 1870 558 2180 435"
            stroke="#084E3E"
            strokeOpacity="0.32"
            strokeWidth="1.6"
          />
          {/* Lower mint sweep */}
          <path
            d="M -160 380 C 280 275 640 380 940 650 C 1140 840 1530 775 1940 645"
            stroke="#79D8AF"
            strokeOpacity="0.34"
            strokeWidth="1.4"
          />
        </g>

        {/*
          Secondary group — counter-phase translate + two dashed paths whose
          stroke-dashoffset is animated by CSS (class .arc-dash-1 / .arc-dash-2).
          Paths start at viewBox x = 800+ so they are always in the visible zone.
          At t=5s the dash has travelled ~694 units (~1.98× its own length):
          unmistakably visible travelling-line motion.
        */}
        <g className="arc-sweep-secondary">
          <path
            className="arc-dash-1"
            d="M 800 210 C 1050 158 1268 192 1478 162 C 1668 142 1838 190 2030 252"
            stroke="#79D8AF"
            strokeOpacity="0.38"
            strokeWidth="1.4"
            strokeDasharray="350 900"
          />
          <path
            className="arc-dash-2"
            d="M 820 700 C 1060 545 1290 530 1580 605 C 1752 650 1920 638 2090 568"
            stroke="#116149"
            strokeOpacity="0.30"
            strokeWidth="1.2"
            strokeDasharray="300 880"
          />
        </g>

        {/* Pulse nodes — all in viewBox x > 1090 (screen x > 870, mask ≥ 0.96) */}
        <circle
          cx="1320" cy="210" r="4"
          fill="#79D8AF" fillOpacity="0.50"
          className="arc-node"
        />
        <circle
          cx="1510" cy="455" r="5"
          fill="#116149" fillOpacity="0.40"
          className="arc-node"
          style={{ animationDelay: "2.1s" }}
        />
        <circle
          cx="1090" cy="610" r="3.5"
          fill="#318B74" fillOpacity="0.36"
          className="arc-node"
          style={{ animationDelay: "4.3s" }}
        />
      </svg>
    </div>
  );
}
