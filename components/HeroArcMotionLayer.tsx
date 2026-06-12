"use client";

import { useEffect, useState } from "react";

/*
  SVG-native (SMIL) hero motion. Animation runs independently of CSS so the
  movement is reliably visible:
    - one large group drifts via <animateTransform type="translate"> (~140px)
    - three curved paths flow via <animate attributeName="stroke-dashoffset">
    - three nodes pulse opacity
  Right/open side carries the motion at higher opacity (0.26–0.34); the
  text side is kept faint by the horizontal mask in globals.css.
  prefers-reduced-motion is honoured by not rendering the animate elements.
*/
export function HeroArcMotionLayer() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const animate = !reduced;

  return (
    <div className="hero-arc-motion-layer" aria-hidden="true">
      <div className="hero-arc-glow" />
      <div className="hero-arc-glow-teal" />

      <svg
        className="hero-arc-motion-svg"
        viewBox="0 0 1800 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Slow-drifting ambient group (translate ~140px peak-to-peak). */}
        <g>
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="-62 16; 80 -28; -62 16"
              keyTimes="0;0.5;1"
              dur="16s"
              calcMode="spline"
              keySplines="0.42 0 0.2 1;0.42 0 0.2 1"
              repeatCount="indefinite"
            />
          ) : null}
          <path
            d="M -300 900 C 250 560 700 360 1220 280 C 1540 220 1780 180 2120 90"
            stroke="#116149"
            strokeOpacity="0.3"
            strokeWidth="2.1"
          />
          <path
            d="M -160 380 C 280 275 640 380 940 650 C 1140 840 1530 775 1940 645"
            stroke="#3f9e74"
            strokeOpacity="0.28"
            strokeWidth="1.7"
          />
        </g>

        {/* Flowing dashed paths — visible travelling motion on the open right side. */}
        <path
          d="M 760 200 C 1040 150 1270 196 1486 158 C 1690 124 1864 188 2060 250"
          stroke="#116149"
          strokeOpacity="0.42"
          strokeWidth="2.4"
          strokeDasharray="120 250"
          strokeLinecap="round"
        >
          {animate ? (
            <animate attributeName="stroke-dashoffset" from="0" to="-370" dur="8s" repeatCount="indefinite" />
          ) : null}
        </path>
        <path
          d="M 820 470 C 1080 430 1300 470 1540 430 C 1730 398 1900 452 2080 410"
          stroke="#2f8f66"
          strokeOpacity="0.36"
          strokeWidth="2.1"
          strokeDasharray="90 220"
          strokeLinecap="round"
        >
          {animate ? (
            <animate attributeName="stroke-dashoffset" from="0" to="-310" dur="10s" repeatCount="indefinite" />
          ) : null}
        </path>
        <path
          d="M 800 690 C 1070 545 1300 540 1580 600 C 1760 638 1930 628 2100 565"
          stroke="#1f7a58"
          strokeOpacity="0.32"
          strokeWidth="1.9"
          strokeDasharray="70 200"
          strokeLinecap="round"
        >
          {animate ? (
            <animate attributeName="stroke-dashoffset" from="0" to="-270" dur="12s" repeatCount="indefinite" />
          ) : null}
        </path>

        {/* Pulse nodes on the open right side. */}
        <circle cx="1330" cy="205" r="4.5" fill="#79D8AF" opacity="0.44">
          {animate ? (
            <animate attributeName="opacity" values="0.24;0.62;0.24" dur="4s" repeatCount="indefinite" />
          ) : null}
        </circle>
        <circle cx="1520" cy="455" r="5.5" fill="#116149" opacity="0.4">
          {animate ? (
            <animate attributeName="opacity" values="0.2;0.56;0.2" dur="5.2s" begin="1.1s" repeatCount="indefinite" />
          ) : null}
        </circle>
        <circle cx="1130" cy="620" r="3.5" fill="#318B74" opacity="0.38">
          {animate ? (
            <animate attributeName="opacity" values="0.18;0.5;0.18" dur="6s" begin="2.4s" repeatCount="indefinite" />
          ) : null}
        </circle>
      </svg>
    </div>
  );
}
