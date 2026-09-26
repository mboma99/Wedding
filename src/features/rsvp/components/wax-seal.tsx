import { useId } from "react";

import { displayFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";

// A jagged break down the middle, used when the seal cracks open.
const CRACK = "60,-4 57,16 63,32 57.5,50 63.5,68 58.5,86 62,104 60,124";

/**
 * A pressed wax seal drawn in SVG: an uneven poured edge, a glossy lit
 * surface, a sunken stamped face with a beaded rim, and an embossed "J & L".
 * With `breakable`, it renders as two halves that .envelope-seal pulls apart.
 */
export function WaxSeal({
  className,
  breakable = false,
}: {
  className?: string;
  breakable?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const ref = (name: string) => `${name}-${id}`;
  const url = (name: string) => `url(#${ref(name)})`;

  const body = (
    <g>
      {/* Poured wax: a disc pushed out of round by turbulence, then lit. */}
      <g filter={url("gloss")}>
        <g filter={url("pour")}>
          <circle cx="60" cy="60" fill={url("wax")} r="50" />
          <ellipse cx="97" cy="78" fill={url("wax")} rx="10" ry="7" />
          <ellipse cx="24" cy="36" fill={url("wax")} rx="8" ry="6" />
        </g>
      </g>

      {/* Sunken stamped face: dark on the upper-left lip, light lower-right. */}
      <circle cx="60" cy="60" fill={url("face")} r="37" />
      <circle cx="60" cy="60" fill="none" r="37" stroke="rgba(40,8,14,0.55)" strokeWidth="2.2" />
      <circle cx="60.8" cy="60.8" fill="none" r="35.6" stroke="rgba(255,205,205,0.22)" strokeWidth="1" />
      {/* Beaded ring, as engraved on the stamp. */}
      <circle
        cx="60"
        cy="60"
        fill="none"
        r="31"
        stroke="rgba(255,214,214,0.4)"
        strokeDasharray="0.01 4.15"
        strokeLinecap="round"
        strokeWidth="1.6"
      />

      {/* Embossed monogram: shadow below, highlight above, wax in between. */}
      <g
        className={displayFont.className}
        fontSize="21"
        letterSpacing="0.4"
        textAnchor="middle"
      >
        <text fill="rgba(35,6,12,0.55)" x="60.8" y="67.9">
          J &amp; L
        </text>
        <text fill="rgba(255,215,215,0.55)" x="59.4" y="66.4">
          J &amp; L
        </text>
        <text fill={url("letter")} x="60" y="67.2">
          J &amp; L
        </text>
      </g>
    </g>
  );

  return (
    <svg
      aria-hidden
      className={cn("overflow-visible drop-shadow-[0_4px_6px_rgba(60,15,20,0.35)]", className)}
      viewBox="0 0 120 120"
    >
      <defs>
        <radialGradient cx="38%" cy="32%" id={ref("wax")} r="75%">
          <stop offset="0" stopColor="#b34e61" />
          <stop offset="0.45" stopColor="#8d3142" />
          <stop offset="1" stopColor="#581722" />
        </radialGradient>
        <radialGradient cx="42%" cy="38%" id={ref("face")} r="70%">
          <stop offset="0" stopColor="#9a3a4c" />
          <stop offset="1" stopColor="#6c2130" />
        </radialGradient>
        <linearGradient id={ref("letter")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#b8566a" />
          <stop offset="1" stopColor="#8a2f40" />
        </linearGradient>

        <filter height="140%" id={ref("pour")} width="140%" x="-20%" y="-20%">
          {/* Low frequency, one octave: soft lumps of poured wax, not a torn edge. */}
          <feTurbulence baseFrequency="0.022" numOctaves="1" result="noise" seed="11" type="fractalNoise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" result="shaped" scale="11" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur in="shaped" result="soft" stdDeviation="0.9" />
          <feComponentTransfer in="soft">
            <feFuncA tableValues="0 0 1 1" type="table" />
          </feComponentTransfer>
        </filter>

        {/* Specular light over the wax's own shape gives the glossy relief. */}
        <filter height="140%" id={ref("gloss")} width="140%" x="-20%" y="-20%">
          <feGaussianBlur in="SourceAlpha" result="blur" stdDeviation="3" />
          <feSpecularLighting
            in="blur"
            lightingColor="#ffe9ea"
            result="spec"
            specularConstant="0.75"
            specularExponent="18"
            surfaceScale="5"
          >
            <fePointLight x="30" y="18" z="70" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feComposite
            in="SourceGraphic"
            in2="specIn"
            k1="0"
            k2="1"
            k3="0.55"
            k4="0"
            operator="arithmetic"
          />
        </filter>

        {breakable ? (
          <>
            <clipPath id={ref("left")}>
              <polygon points={`-10,-10 ${CRACK} -10,130`} />
            </clipPath>
            <clipPath id={ref("right")}>
              <polygon points={`${CRACK} 130,130 130,-10`} />
            </clipPath>
            <g id={ref("body")}>{body}</g>
          </>
        ) : null}
      </defs>

      {breakable ? (
        <>
          {/* Whole until opened, so no seam shows along the break line. */}
          <g className="seal-whole">
            <use href={`#${ref("body")}`} />
          </g>
          <g className="seal-half seal-half-left" clipPath={url("left")}>
            <use href={`#${ref("body")}`} />
          </g>
          <g className="seal-half seal-half-right" clipPath={url("right")}>
            <use href={`#${ref("body")}`} />
          </g>
        </>
      ) : (
        body
      )}
    </svg>
  );
}
