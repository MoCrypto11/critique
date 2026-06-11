export function HeroMotionBackground() {
  return (
    <div className="hero-motion-background" aria-hidden="true">
      <div className="hero-ambient-glow hero-ambient-glow-primary" />
      <div className="hero-ambient-glow hero-ambient-glow-secondary" />
      <div className="hero-orbit-system">
        <svg
          className="hero-orbits"
          viewBox="0 0 1440 760"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g strokeLinecap="round">
            <path d="M760 -40C1020 120 1160 360 1500 430" stroke="#084E3E" strokeOpacity="0.23" strokeWidth="1.35" />
            <path d="M860 20C1120 260 1240 520 1580 720" stroke="#318B74" strokeOpacity="0.17" strokeWidth="1.1" />
            <path d="M940 -80C1060 180 1180 420 1360 820" stroke="#071A18" strokeOpacity="0.11" strokeWidth="1" />
            <path d="M620 680C860 360 1120 280 1500 330" stroke="#116149" strokeOpacity="0.16" strokeWidth="1.15" />
            <path
              d="M740 520C980 430 1180 460 1450 600"
              stroke="#79D8AF"
              strokeDasharray="16 22"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
            <path d="M840 96C962 196 1098 248 1248 252" stroke="#9D8146" strokeOpacity="0.15" strokeWidth="0.95" />
          </g>

          <g className="hero-orbits-secondary" strokeLinecap="round">
            <path d="M690 126C874 212 1034 216 1210 142" stroke="#084E3E" strokeOpacity="0.1" strokeWidth="0.9" />
            <path d="M812 702C946 604 1124 574 1368 618" stroke="#318B74" strokeOpacity="0.12" strokeWidth="0.9" />
            <path
              d="M538 610C732 486 914 438 1106 466"
              stroke="#071A18"
              strokeDasharray="5 18"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </g>

          <g className="hero-orbits-technical" stroke="#116149" strokeLinecap="round">
            <path d="M912 154H1068" strokeOpacity="0.16" />
            <path d="M1014 154V226" strokeOpacity="0.12" />
            <path d="M1014 226H1184" strokeOpacity="0.14" />
            <path d="M1136 226V304" strokeOpacity="0.1" />
            <path d="M798 568H978" strokeOpacity="0.12" />
            <path d="M978 568V632" strokeOpacity="0.09" />
          </g>

          <g className="hero-orbits-nodes">
            <circle cx="1014" cy="154" r="3" fill="#79D8AF" fillOpacity="0.26" />
            <circle cx="1014" cy="226" r="2.5" fill="#116149" fillOpacity="0.2" />
            <circle cx="1136" cy="304" r="2.5" fill="#9D8146" fillOpacity="0.18" />
            <circle cx="978" cy="568" r="2.5" fill="#318B74" fillOpacity="0.18" />
          </g>
        </svg>
      </div>
    </div>
  );
}
