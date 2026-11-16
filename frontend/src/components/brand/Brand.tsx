/**
 * A marca do GoMoney: a marmota do Go (o gopher de Renée French, CC BY 4.0),
 * redesenhada em formas chapadas, segurando uma moeda de ouro com um G.
 *
 * Dois tons: `ink` (corpo quase preto, para o papel claro do app) e `ivory`
 * (corpo claro, para o fundo escuro da apresentação).
 */
export function BrandMark({ size = 32, tone = 'ink', title }: { size?: number; tone?: 'ink' | 'ivory'; title?: string }) {
  const body = tone === 'ink' ? '#16181d' : '#ece6d6';
  const eye = '#ffffff';
  const pupil = '#16181d';
  const sand = tone === 'ink' ? '#d8ccb2' : '#b9ab8c';
  // No tom claro, o branco do olho precisa de um contorno para não sumir no corpo.
  const eyeStroke = tone === 'ivory' ? pupil : 'none';
  const eyeStrokeWidth = tone === 'ivory' ? 1 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g fill={body}>
        <circle
          cx="15.6"
          cy="15"
          r="3.6"
        />

        <circle
          cx="48.4"
          cy="15"
          r="3.6"
        />

        <path d="M12 31C12 17.6 21 9 32 9S52 17.6 52 31V56Q52 62 46 62H18Q12 62 12 56Z" />
      </g>

      <circle
        cx="22.6"
        cy="22.6"
        r="8.6"
        fill={eye}
        stroke={eyeStroke}
        strokeWidth={eyeStrokeWidth}
      />

      <circle
        cx="41.4"
        cy="22.6"
        r="8.6"
        fill={eye}
        stroke={eyeStroke}
        strokeWidth={eyeStrokeWidth}
      />

      <circle
        cx="24.6"
        cy="25.4"
        r="3.1"
        fill={pupil}
      />

      <circle
        cx="39.4"
        cy="25.4"
        r="3.1"
        fill={pupil}
      />

      <ellipse
        cx="32"
        cy="33.2"
        rx="5.4"
        ry="3.8"
        fill={sand}
      />

      <ellipse
        cx="32"
        cy="31.4"
        rx="2.6"
        ry="1.7"
        fill={pupil}
      />

      <path
        d="M30 35.6h4v2.9a.7.7 0 0 1-.7.7h-2.6a.7.7 0 0 1-.7-.7z"
        fill="#fff"
      />

      <path
        d="M32 35.6v3.6"
        stroke={pupil}
        strokeWidth=".7"
      />

      <circle
        cx="32"
        cy="51"
        r="11.5"
        fill="#c9a24a"
      />

      <circle
        cx="32"
        cy="51"
        r="8.6"
        fill="none"
        stroke="#7d5f17"
        strokeWidth="1.3"
      />

      <path
        d="M35.6 47.6a4.6 4.6 0 1 0 .9 4H32.4"
        fill="none"
        stroke="#7d5f17"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <ellipse
        cx="20.6"
        cy="47.8"
        rx="3.2"
        ry="4.2"
        fill={sand}
      />

      <ellipse
        cx="43.4"
        cy="47.8"
        rx="3.2"
        ry="4.2"
        fill={sand}
      />
    </svg>
  );
}

/** O nome, no serifado da marca. "Go" e "Money" na mesma tinta: a marca não precisa de destaque. */
export function BrandWordmark({ size = 24, color }: { size?: number; color?: string }) {
  // O tamanho varia por uso (22, 26…), então fica no style; o resto é a classe.
  return (
    <span
      className="font-serif leading-none tracking-[-0.01em]"
      style={{ fontSize: size, color }}
    >
      GoMoney
    </span>
  );
}
