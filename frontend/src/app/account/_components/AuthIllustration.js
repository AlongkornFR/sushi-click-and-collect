// Illustration des pages connexion / inscription, dessinée en SVG aux
// couleurs du site : un téléphone avec une commande Su-Rice, un sac à
// emporter, des sushis et des nuages sur fond ambre. Décorative
// (aria-hidden) ; nette à toutes les tailles et sans requête réseau.

const INK = "#1B1B1B";
const INK_DEEP = "#0F0F0F";
const CREAM = "#FFF8EC";
const AMBER = "#FFC366";
const SALMON = "#FF8A5B";
const SALMON_DEEP = "#E86F42";

function Cloud({ x, y, s = 1, opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={opacity}>
      <circle cx="-38" cy="6" r="30" />
      <circle cx="0" cy="-14" r="42" />
      <circle cx="44" cy="2" r="34" />
      <rect x="-68" y="6" width="146" height="34" rx="17" />
    </g>
  );
}

function Maki({ x, y, r = 34, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <ellipse cx="6" cy="10" rx={r} ry={r * 0.96} fill={INK_DEEP} />
      <circle r={r} fill={INK} />
      <circle r={r * 0.76} fill={CREAM} />
      <circle r={r * 0.34} fill={SALMON} />
      <circle cx={r * 0.12} cy={-r * 0.1} r={r * 0.12} fill="#7CC36A" />
      <circle cx={-r * 0.45} cy={-r * 0.4} r={r * 0.06} fill="#E9DCC6" />
      <circle cx={r * 0.5} cy={r * 0.3} r={r * 0.06} fill="#E9DCC6" />
    </g>
  );
}

function Nigiri({ x, y, s = 1, rotate = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`}>
      <rect x="-52" y="-4" width="112" height="46" rx="23" fill={INK_DEEP} opacity="0.35" />
      <rect x="-56" y="-12" width="112" height="46" rx="23" fill={CREAM} />
      <path d="M-62 -6 C-50 -40 50 -44 64 -14 C70 -2 58 6 40 4 L-48 6 C-62 6 -66 2 -62 -6 Z" fill={SALMON} />
      <path d="M-30 -28 C-24 -18 -24 -6 -30 2" stroke="#FFD9C7" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M-4 -34 C2 -22 2 -8 -4 2" stroke="#FFD9C7" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M22 -34 C28 -22 28 -8 22 2" stroke="#FFD9C7" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M44 -26 C50 -18 50 -8 46 0" stroke="#FFD9C7" strokeWidth="4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function Sparkle({ x, y, s = 1 }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -14 C2 -4 4 -2 14 0 C4 2 2 4 0 14 C-2 4 -4 2 -14 0 C-4 -2 -2 -4 0 -14 Z"
      fill="#fff"
    />
  );
}

export default function AuthIllustration({ className = "", align = "xMidYMid" }) {
  return (
    <svg
      viewBox="0 0 600 760"
      preserveAspectRatio={`${align} slice`}
      className={className}
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="auth-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD58E" />
          <stop offset="0.55" stopColor="#FFC366" />
          <stop offset="1" stopColor="#F29F2E" />
        </linearGradient>
        <radialGradient id="auth-glow" cx="0.62" cy="0.42" r="0.5">
          <stop offset="0" stopColor="#FFF3D6" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFF3D6" stopOpacity="0" />
        </radialGradient>
        {/* Vagues seigaiha, motif japonais traditionnel */}
        <pattern id="auth-waves" width="48" height="24" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#fff" strokeWidth="2" opacity="0.35">
            <path d="M0 24 a24 24 0 0 1 48 0" />
            <path d="M8 24 a16 16 0 0 1 32 0" />
            <path d="M16 24 a8 8 0 0 1 16 0" />
            <path d="M-24 12 a24 24 0 0 1 48 0" />
            <path d="M24 12 a24 24 0 0 1 48 0" />
          </g>
        </pattern>
        <linearGradient id="auth-waves-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="auth-waves-mask">
          <rect x="0" y="520" width="600" height="240" fill="url(#auth-waves-fade)" />
        </mask>
      </defs>

      {/* Fond */}
      <rect width="600" height="760" fill="url(#auth-bg)" />
      <rect width="600" height="760" fill="url(#auth-glow)" />
      <rect x="0" y="520" width="600" height="240" fill="url(#auth-waves)" mask="url(#auth-waves-mask)" />

      {/* Nuages du haut */}
      <Cloud x={70} y={96} s={1.1} />
      <Cloud x={545} y={60} s={1.25} />
      <Cloud x={300} y={150} s={0.55} opacity={0.75} />

      {/* Téléphone : face sombre décalée pour l'effet de relief */}
      <g transform="translate(345 390) rotate(-9)">
        <rect x="-122" y="-244" width="264" height="500" rx="40" fill={INK_DEEP} />
        <rect x="-136" y="-252" width="264" height="500" rx="40" fill={INK} />
        <rect x="-122" y="-238" width="236" height="472" rx="30" fill={CREAM} />
        <circle cx="-4" cy="-220" r="6" fill={INK} />

        {/* En-tête de l'application */}
        <text x="-100" y="-176" fontFamily="system-ui, -apple-system, sans-serif" fontSize="22" fontWeight="800" fill={INK}>
          Su-Rice
        </text>
        <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
          <line x1="66" y1="-190" x2="90" y2="-190" />
          <line x1="72" y1="-181" x2="90" y2="-181" />
          <line x1="78" y1="-172" x2="90" y2="-172" />
        </g>

        {/* Carte plateau de sushis */}
        <rect x="-102" y="-152" width="196" height="150" rx="20" fill={INK} />
        <ellipse cx="-4" cy="-70" rx="72" ry="40" fill="#2B2B2B" />
        <Maki x={-44} y={-78} r={22} />
        <Maki x={-4} y={-90} r={22} />
        <Maki x={36} y={-76} r={22} />
        <rect x="-82" y="-140" width="58" height="22" rx="11" fill={AMBER} />
        <text x="-53" y="-124" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="12" fontWeight="800" fill={INK}>
          Maki
        </text>

        {/* Lignes du panier */}
        <g>
          <circle cx="-82" cy="34" r="16" fill={SALMON} />
          <rect x="-56" y="24" width="88" height="9" rx="4.5" fill="#D9CDB8" />
          <rect x="-56" y="39" width="56" height="8" rx="4" fill="#E9DFCD" />
          <rect x="46" y="22" width="48" height="24" rx="12" fill={AMBER} />
          <circle cx="-82" cy="84" r="16" fill="#7CC36A" />
          <rect x="-56" y="74" width="74" height="9" rx="4.5" fill="#D9CDB8" />
          <rect x="-56" y="89" width="46" height="8" rx="4" fill="#E9DFCD" />
          <rect x="46" y="72" width="48" height="24" rx="12" fill={AMBER} />
        </g>

        {/* Préparation en cours */}
        <rect x="-100" y="128" width="194" height="8" rx="4" fill="#E9DFCD" />
        <rect x="-100" y="128" width="130" height="8" rx="4" fill={SALMON} />

        {/* Bouton */}
        <rect x="-100" y="160" width="194" height="48" rx="24" fill={INK} />
        <text x="-3" y="190" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="16" fontWeight="800" fill={AMBER}>
          Retrait 12:30
        </text>
      </g>

      {/* Bulle de validation */}
      <g transform="translate(128 236) rotate(-8) scale(0.82)">
        <path d="M-70 -50 h120 a36 36 0 0 1 36 36 v38 a36 36 0 0 1 -36 36 h-40 l40 40 l-78 -40 h-42 a36 36 0 0 1 -36 -36 v-38 a36 36 0 0 1 36 -36 Z" fill={INK_DEEP} transform="translate(10 10)" />
        <path d="M-70 -50 h120 a36 36 0 0 1 36 36 v38 a36 36 0 0 1 -36 36 h-40 l40 40 l-78 -40 h-42 a36 36 0 0 1 -36 -36 v-38 a36 36 0 0 1 36 -36 Z" fill="#fff" />
        <path d="M-34 6 L-10 28 L36 -22" stroke={SALMON} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Sac à emporter */}
      <g transform="translate(150 585) rotate(7)">
        <path d="M-84 -86 L84 -86 L98 116 L-98 116 Z" fill="#9E6631" transform="translate(14 8)" />
        <path d="M-84 -86 L84 -86 L98 116 L-98 116 Z" fill="#C98B4A" />
        <path d="M-84 -86 L84 -86 L86 -60 L-86 -60 Z" fill="#B47838" />
        <path d="M-42 -86 C-42 -156 42 -156 42 -86" stroke="#6E4520" strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx="0" cy="22" r="40" fill={INK} />
        <text x="0" y="29" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontSize="17" fontWeight="800" fill={AMBER}>
          Su-Rice
        </text>
      </g>

      {/* Baguettes */}
      <g transform="translate(270 640) rotate(-28)">
        <rect x="-120" y="-6" width="240" height="12" rx="6" fill="#5A3A1E" />
        <rect x="-112" y="14" width="226" height="11" rx="5.5" fill="#6E4826" />
        <rect x="-120" y="-6" width="40" height="12" rx="6" fill={INK} />
        <rect x="-112" y="14" width="40" height="11" rx="5.5" fill={INK} />
      </g>

      {/* Sushis qui flottent */}
      <Nigiri x={492} y={548} s={1.05} rotate={-12} />
      <Maki x={500} y={330} r={36} rotate={10} />
      <Maki x={420} y={690} r={26} rotate={-6} />

      {/* Nuages du bas */}
      <Cloud x={70} y={735} s={1.2} />
      <Cloud x={560} y={705} s={1.05} />

      <Sparkle x={250} y={92} s={0.9} />
      <Sparkle x={548} y={430} s={0.7} />
      <Sparkle x={58} y={420} s={0.6} />
    </svg>
  );
}
