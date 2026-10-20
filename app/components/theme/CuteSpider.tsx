// Arañita de Halloween: silueta simple y estilizada (abdomen, cabeza y patitas
// dobladas), sin cara. Se usa dentro de otros SVG (logo y telaraña).
// Coordenadas locales: el abdomen está centrado en (0, 0).
const BODY = "#1f1b18";

const LEGS = [0, 1, 2, 3].map((i) => {
  const y = -12 + i * 5;
  return {
    left: `M-8 ${y} L-28 ${-26 + i * 10} L-38 ${-8 + i * 12}`,
    right: `M8 ${y} L28 ${-26 + i * 10} L38 ${-8 + i * 12}`,
  };
});

export default function CuteSpider({ x, y, scale = 1, thread = 0, threadColor = "#94a3b8" }: { x: number; y: number; scale?: number; thread?: number; threadColor?: string }) {
  return (
    // El grupo externo admite la animación CSS (balanceo); el interno, la posición.
    <g className="ms-spider">
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        {thread > 0 && <path d={`M0 ${-thread} L0 -18`} stroke={threadColor} strokeWidth={2.2 / scale} />}
        <g stroke={BODY} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {LEGS.map((leg, i) => (
            <g key={i}>
              <path d={leg.left} />
              <path d={leg.right} />
            </g>
          ))}
        </g>
        <circle cx="0" cy="-12" r="8" fill={BODY} />
        <ellipse cx="0" cy="4" rx="14" ry="16" fill={BODY} />
        <ellipse cx="-5" cy="-2" rx="4" ry="6" fill="#ffffff" opacity=".14" transform="rotate(20 -5 -2)" />
      </g>
    </g>
  );
}
