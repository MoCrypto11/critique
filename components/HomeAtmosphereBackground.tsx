"use client";

import { useEffect, useState } from "react";

/*
  Page-level atmospheric background for the WHOLE homepage. Mounted once at the
  homepage root, behind every section, so the dark teal/green mood and motion
  are one continuous canvas — not a hero-only banner.
    - hero zone (top): strongest motion — drifting glows + flowing SVG lines
    - lower page: soft ambient glow pools that continue the same environment
  prefers-reduced-motion disables the animation; the static glows remain.
*/
export function HomeAtmosphereBackground() {
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
    <div className="home-atmosphere" aria-hidden="true">
      {/* Hero zone — strongest motion at the top of the shared canvas. */}
      <div className="home-atmosphere-hero">
        <div className="hero-arc-glow" />
        <div className="hero-arc-glow-teal" />

        <svg
          className="hero-arc-motion-svg"
          viewBox="0 0 1800 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle contour/wave texture drifting slowly across the canvas. */}
          <g stroke="#79D8AF" fill="none" strokeWidth="1.1">
            {animate ? (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="-26 0; 30 0; -26 0"
                dur="22s"
                repeatCount="indefinite"
              />
            ) : null}
            <path d="M -200 170 C 250 120 600 210 950 165 C 1300 120 1650 205 2050 160" strokeOpacity="0.08" />
            <path d="M -200 330 C 250 285 600 372 950 327 C 1300 282 1650 366 2050 322" strokeOpacity="0.07" />
            <path d="M -200 500 C 250 452 600 542 950 497 C 1300 452 1650 536 2050 492" strokeOpacity="0.06" />
            <path d="M -200 670 C 250 622 600 712 950 667 C 1300 622 1650 706 2050 662" strokeOpacity="0.055" />
            <path d="M -200 830 C 250 786 600 872 950 827 C 1300 782 1650 866 2050 822" strokeOpacity="0.05" />
          </g>

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
              stroke="#3fa97e"
              strokeOpacity="0.34"
              strokeWidth="2.1"
            />
            <path
              d="M -160 380 C 280 275 640 380 940 650 C 1140 840 1530 775 1940 645"
              stroke="#79D8AF"
              strokeOpacity="0.3"
              strokeWidth="1.7"
            />
          </g>

          <path
            d="M 760 200 C 1040 150 1270 196 1486 158 C 1690 124 1864 188 2060 250"
            stroke="#79D8AF"
            strokeOpacity="0.4"
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
            stroke="#4fb88c"
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
            stroke="#3fa97e"
            strokeOpacity="0.32"
            strokeWidth="1.9"
            strokeDasharray="70 200"
            strokeLinecap="round"
          >
            {animate ? (
              <animate attributeName="stroke-dashoffset" from="0" to="-270" dur="12s" repeatCount="indefinite" />
            ) : null}
          </path>

          <circle cx="1330" cy="205" r="4.5" fill="#79D8AF" opacity="0.44">
            {animate ? (
              <animate attributeName="opacity" values="0.24;0.62;0.24" dur="4s" repeatCount="indefinite" />
            ) : null}
          </circle>
          <circle cx="1520" cy="455" r="5.5" fill="#9be9c6" opacity="0.4">
            {animate ? (
              <animate attributeName="opacity" values="0.2;0.56;0.2" dur="5.2s" begin="1.1s" repeatCount="indefinite" />
            ) : null}
          </circle>
          <circle cx="1130" cy="620" r="3.5" fill="#5fc79c" opacity="0.38">
            {animate ? (
              <animate attributeName="opacity" values="0.18;0.5;0.18" dur="6s" begin="2.4s" repeatCount="indefinite" />
            ) : null}
          </circle>
        </svg>
      </div>

      {/* Lower-page ambient continuation — softer glow pools behind the sections. */}
      <div className="atmo-glow atmo-glow-mid" />
      <div className="atmo-glow atmo-glow-low" />
    </div>
  );
}
