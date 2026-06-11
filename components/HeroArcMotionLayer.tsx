export function HeroArcMotionLayer() {
  return (
    <div className="hero-arc-motion-layer" aria-hidden="true">
      <svg
        className="hero-arc-motion-svg"
        viewBox="0 0 1800 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="heroMintGlow" cx="72%" cy="34%" r="52%">
            <stop offset="0%" stopColor="#79D8AF" stopOpacity="0.20" />
            <stop offset="55%" stopColor="#79D8AF" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#79D8AF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft ambient glow — breathes independently of all path motion */}
        <rect x="0" y="0" width="1800" height="900" fill="url(#heroMintGlow)">
          <animate
            attributeName="opacity"
            values="0.60;0.90;0.60"
            dur="14s"
            repeatCount="indefinite"
          />
        </rect>

        {/*
          Primary group — three large curves translate together, 18 s cycle.
          animateTransform is a child of the <g> it targets (valid SVG SMIL).
          At t=5 s the group has moved ~72 px horizontally: clearly visible.
        */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-140 0; 120 -34; -140 0"
            dur="18s"
            repeatCount="indefinite"
          />

          {/* Signature sweep: lower-left → upper-right through the right zone */}
          <path
            d="M -300 900 C 250 560 700 360 1220 280 C 1540 220 1780 180 2120 90"
            stroke="#116149"
            strokeOpacity="0.30"
            strokeWidth="1.5"
          />
          {/* Counter-arc: above viewport sweeping down-right */}
          <path
            d="M 220 -100 C 580 280 900 460 1360 555 C 1640 615 1870 558 2180 435"
            stroke="#084E3E"
            strokeOpacity="0.22"
            strokeWidth="1.2"
          />
          {/* Lower mint arc */}
          <path
            d="M -160 380 C 280 275 640 380 940 650 C 1140 840 1530 775 1940 645"
            stroke="#79D8AF"
            strokeOpacity="0.24"
            strokeWidth="1.1"
          />
        </g>

        {/*
          Secondary group — two dashed paths translate in the opposite direction
          at 26 s, while each path also runs its own stroke-dashoffset animation.
          The dashoffset gives unmistakable travelling-line motion regardless of
          whether the CSS transform system is active.
        */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="80 -20; -90 28; 80 -20"
            dur="26s"
            repeatCount="indefinite"
          />

          {/*
            Dashed mint — upper right zone.
            stroke-dasharray sum ≈ 1250 (≈ path length).
            At 9 s the dash completes one full traversal of the path.
            At t=5 s the dash has travelled ~693 units: visible at x ≈ 1460 viewBox.
          */}
          <path
            d="M 800 210 C 1050 158 1268 192 1478 162 C 1668 142 1838 190 2030 252"
            stroke="#79D8AF"
            strokeOpacity="0.30"
            strokeWidth="1.2"
            strokeDasharray="350 900"
            strokeDashoffset="0"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-1250"
              dur="9s"
              repeatCount="indefinite"
            />
          </path>

          {/*
            Dashed dark green — lower right zone.
            At 12 s dash completes one traversal; at t=5 s visible at x ≈ 1580 viewBox.
          */}
          <path
            d="M 820 700 C 1060 545 1290 530 1580 605 C 1752 650 1920 638 2090 568"
            stroke="#116149"
            strokeOpacity="0.24"
            strokeWidth="1.0"
            strokeDasharray="300 880"
            strokeDashoffset="0"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-1180"
              dur="12s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* Pulse nodes — all in viewBox x > 1080 (right-zone viewport, mask ≥ 0.78) */}
        <circle cx="1320" cy="210" r="4" fill="#79D8AF" opacity="0.34">
          <animate
            attributeName="opacity"
            values="0.18;0.48;0.18"
            dur="7s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="1510" cy="455" r="5" fill="#116149" opacity="0.28">
          <animate
            attributeName="opacity"
            values="0.12;0.38;0.12"
            dur="9s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="1090" cy="610" r="3.5" fill="#318B74" opacity="0.22">
          <animate
            attributeName="opacity"
            values="0.10;0.32;0.10"
            dur="11s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
