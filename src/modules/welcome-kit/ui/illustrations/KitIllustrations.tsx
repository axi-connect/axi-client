/**
 * Ilustraciones del kit de bienvenida, a mano alzada.
 *
 * Los trazados, colores y rótulos están copiados TAL CUAL del paquete de diseño
 * (`welcome-kit-handoff/reference/kit.html`): no se «limpian» ni se redondean,
 * porque el trazo a mano es el filtro `#wk-rough` (feTurbulence) aplicado sobre
 * estas coordenadas exactas. Lo único que cambió frente al paquete:
 * - los ids de los filtros y marcadores llevan el prefijo `wk-`, para no chocar
 *   con otro SVG de la página;
 * - la familia de los `<text>` la resuelve el CSS del kit (con next/font el
 *   nombre real de Shadows Into Light lleva hash), aunque conservan su atributo;
 * - los bocetos con significado llevan `role="img"` y su `aria-label`; los
 *   conectores decorativos, `aria-hidden`.
 *
 * `KitSvgDefs` se monta UNA vez, al principio del kit: el resto la referencia.
 */

type SketchProps = { className?: string }

export function KitSvgDefs({ className }: SketchProps) {
  return (
    <svg width="0" height="0" className={className} aria-hidden="true" focusable="false">
      <defs>
        <filter id="wk-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n"></feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
        </filter>
        <filter id="wk-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" result="b"></feGaussianBlur>
          <feMerge><feMergeNode in="b"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
        </filter>
        <marker id="wk-ahC" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L10 6 L1 11" fill="none" stroke="#FB7185" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></marker>
        <marker id="wk-ahV" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L10 6 L1 11" fill="none" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></marker>
        <marker id="wk-ahA" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M1 1 L10 6 L1 11" fill="none" stroke="#FBBF24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"></path></marker>
      </defs>
    </svg>
  )
}

export function WelcomeSketch({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 756 320" width="100%" className={className} role="img" aria-label="Boceto: el cliente escribe, el agente cotiza, el pedido llega a tu equipo">
      <g filter="url(#wk-glow)">
        <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="30" y="20" width="170" height="290" rx="24" stroke="#A78BFA"></rect>
          <path d="M95 36 H135" stroke="#A78BFA"></path>
          <rect x="48" y="62" width="104" height="30" rx="12" stroke="#A78BFA"></rect>
          <path d="M60 77 H136" stroke="#A78BFA" opacity=".6"></path>
          <rect x="78" y="104" width="106" height="44" rx="12" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <path d="M90 118 H170 M90 132 H150" stroke="#FFE4E6"></path>
          <rect x="48" y="162" width="92" height="30" rx="12" stroke="#A78BFA"></rect>
          <path d="M60 177 H126" stroke="#A78BFA" opacity=".6"></path>
          <rect x="70" y="206" width="114" height="62" rx="12" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <path d="M82 222 H168 M82 236 H150 M82 250 H160" stroke="#FFE4E6"></path>
          <path d="M80 292 H150" stroke="#A78BFA" opacity=".5"></path>
          <path d="M212 160 C 250 118, 292 116, 324 142" stroke="#FB7185" markerEnd="url(#wk-ahC)"></path>
          <path d="M340 50 H520 V250 L505 262 L490 250 L475 262 L460 250 L445 262 L430 250 L415 262 L400 250 L385 262 L370 250 L355 262 L340 250 Z" stroke="#A78BFA"></path>
          <path d="M360 78 H440" stroke="#A78BFA"></path>
          <rect x="360" y="102" width="14" height="14" rx="2" stroke="#FBBF24"></rect><path d="M363 109 L367 113 L372 104" stroke="#FBBF24"></path><path d="M386 109 H480" stroke="#A78BFA" opacity=".7"></path>
          <rect x="360" y="162" width="14" height="14" rx="2" stroke="#FBBF24"></rect><path d="M363 169 L367 173 L372 164" stroke="#FBBF24"></path><path d="M386 169 H470" stroke="#A78BFA" opacity=".7"></path>
          <rect x="328" y="128" width="176" height="26" rx="6" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <path d="M344 141 H456" stroke="#FFE4E6"></path>
          <path d="M360 214 H420" stroke="#A78BFA"></path>
          <path d="M458 214 H500" stroke="#FBBF24" strokeWidth="3"></path>
          <path d="M532 156 C 562 154, 582 124, 604 110" stroke="#FB7185" markerEnd="url(#wk-ahC)"></path>
          <rect x="610" y="40" width="130" height="110" rx="12" stroke="#A78BFA"></rect>
          <path d="M610 62 H740" stroke="#A78BFA"></path>
          <circle cx="623" cy="51" r="3" stroke="#A78BFA"></circle><circle cx="634" cy="51" r="3" stroke="#A78BFA"></circle><circle cx="645" cy="51" r="3" stroke="#A78BFA"></circle>
          <rect x="624" y="76" width="74" height="26" rx="6" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <path d="M624 118 H722 M624 132 H700" stroke="#A78BFA" opacity=".6"></path>
          <path d="M702 94 L716 128 L721 115 L734 111 Z" fill="#A78BFA" stroke="#A78BFA"></path>
          <path d="M230 302 C 380 304, 540 292, 696 234" stroke="#FBBF24" strokeDasharray="2 9"></path>
          <circle cx="700" cy="232" r="5" fill="#FBBF24" stroke="#FBBF24"></circle>
        </g>
        <text x="214" y="96" fill="#FB7185" fontFamily="Shadows Into Light" fontSize="21">11:48 P. M.</text>
        <text x="352" y="36" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="22">PEDIDO LISTO</text>
        <text x="604" y="182" fill="#A78BFA" fontFamily="Shadows Into Light" fontSize="20">TU EQUIPO DESPACHA</text>
        <text x="574" y="224" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="20">EMPIEZA HOY</text>
      </g>
    </svg>
  )
}

export function QuoteSketch({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 240 170" width="100%" className={className} role="img" aria-label="Boceto: catálogo y cotización">
      <g filter="url(#wk-glow)">
        <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="14" y="30" width="124" height="126" rx="10" stroke="#A78BFA"></rect>
          <path d="M28 56 H88 M28 80 H80 M28 128 H84" stroke="#A78BFA" opacity=".7"></path>
          <path d="M104 56 H124 M104 80 H124 M104 128 H124" stroke="#FBBF24"></path>
          <rect x="6" y="92" width="140" height="24" rx="6" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <path d="M22 104 H86 M104 104 H126" stroke="#FFE4E6"></path>
          <path d="M150 102 C 172 102, 180 90, 190 80" stroke="#FB7185" markerEnd="url(#wk-ahC)"></path>
          <rect x="160" y="38" width="76" height="36" rx="12" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
        </g>
        <text x="198" y="62" textAnchor="middle" fill="#FFF1F2" fontFamily="Shadows Into Light" fontSize="18">$ 12.000</text>
        <text x="14" y="20" fill="#A78BFA" fontFamily="Shadows Into Light" fontSize="18">TU CATÁLOGO</text>
      </g>
    </svg>
  )
}

export function OrderSketch({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 240 170" width="100%" className={className} role="img" aria-label="Boceto: pedido armado">
      <g filter="url(#wk-glow)">
        <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M40 10 H170 V132 L159 142 L148 132 L137 142 L126 132 L115 142 L104 132 L93 142 L82 132 L71 142 L60 132 L49 142 L40 132 Z" stroke="#A78BFA"></path>
          <rect x="54" y="30" width="12" height="12" rx="2" stroke="#FBBF24"></rect><path d="M56 36 L60 40 L65 32" stroke="#FBBF24"></path><path d="M76 36 H150" stroke="#A78BFA" opacity=".7"></path>
          <rect x="54" y="54" width="12" height="12" rx="2" stroke="#FBBF24"></rect><path d="M56 60 L60 64 L65 56" stroke="#FBBF24"></path><path d="M76 60 H140" stroke="#A78BFA" opacity=".7"></path>
          <rect x="54" y="78" width="12" height="12" rx="2" stroke="#FBBF24"></rect><path d="M56 84 L60 88 L65 80" stroke="#FBBF24"></path><path d="M76 84 H146" stroke="#A78BFA" opacity=".7"></path>
          <rect x="30" y="98" width="152" height="24" rx="6" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <path d="M46 110 H96 M134 110 H166" stroke="#FFE4E6"></path>
          <path d="M180 114 L194 148 L199 135 L212 131 Z" fill="#A78BFA" stroke="#A78BFA"></path>
        </g>
        <text x="110" y="166" textAnchor="middle" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="18">LISTO PARA DESPACHAR</text>
      </g>
    </svg>
  )
}

export function PaySketch({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 240 170" width="100%" className={className} role="img" aria-label="Boceto: medios de pago y confirmación">
      <g filter="url(#wk-glow)">
        <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="14" y="22" width="84" height="30" rx="15" stroke="#A78BFA"></rect>
          <rect x="14" y="66" width="84" height="30" rx="15" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <rect x="14" y="110" width="84" height="30" rx="15" stroke="#A78BFA"></rect>
          <path d="M104 81 C 128 81, 138 76, 156 76" stroke="#FB7185" markerEnd="url(#wk-ahC)"></path>
          <circle cx="190" cy="76" r="26" stroke="#FBBF24"></circle>
          <path d="M178 76 L187 86 L204 66" stroke="#FBBF24" strokeWidth="3"></path>
        </g>
        <text x="56" y="43" textAnchor="middle" fill="#A78BFA" fontFamily="Shadows Into Light" fontSize="17">NEQUI</text>
        <text x="56" y="87" textAnchor="middle" fill="#FFF1F2" fontFamily="Shadows Into Light" fontSize="17">PSE</text>
        <text x="56" y="131" textAnchor="middle" fill="#A78BFA" fontFamily="Shadows Into Light" fontSize="17">TARJETA</text>
        <text x="190" y="128" textAnchor="middle" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="18">TU EQUIPO</text>
        <text x="190" y="148" textAnchor="middle" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="18">CONFIRMA</text>
      </g>
    </svg>
  )
}

export function PanelSketch({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 420 300" width="100%" className={className} role="img" aria-label="Boceto: panel con todas las conversaciones">
      <g filter="url(#wk-glow)">
        <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="20" y="20" width="360" height="230" rx="16" stroke="#A78BFA"></rect>
          <path d="M20 50 H380 M110 50 V250" stroke="#A78BFA"></path>
          <circle cx="38" cy="35" r="4" stroke="#A78BFA"></circle><circle cx="52" cy="35" r="4" stroke="#A78BFA"></circle><circle cx="66" cy="35" r="4" stroke="#A78BFA"></circle>
          <rect x="150" y="28" width="120" height="14" rx="7" stroke="#A78BFA" opacity=".6"></rect>
          <circle cx="40" cy="80" r="5" stroke="#A78BFA"></circle><path d="M52 80 H92" stroke="#A78BFA" opacity=".6"></path>
          <circle cx="40" cy="110" r="5" stroke="#FB7185"></circle><path d="M52 110 H86" stroke="#FB7185"></path>
          <circle cx="40" cy="140" r="5" stroke="#A78BFA"></circle><path d="M52 140 H90" stroke="#A78BFA" opacity=".6"></path>
          <circle cx="40" cy="170" r="5" stroke="#A78BFA"></circle><path d="M52 170 H80" stroke="#A78BFA" opacity=".6"></path>
          <circle cx="142" cy="89" r="11" stroke="#A78BFA"></circle><path d="M162 83 H300 M162 97 H250" stroke="#A78BFA" opacity=".6"></path><path d="M332 83 H360" stroke="#FBBF24"></path>
          <circle cx="142" cy="177" r="11" stroke="#A78BFA"></circle><path d="M162 171 H290 M162 185 H240" stroke="#A78BFA" opacity=".6"></path><path d="M332 171 H360" stroke="#FBBF24"></path>
          <circle cx="142" cy="221" r="11" stroke="#A78BFA"></circle><path d="M162 215 H280 M162 229 H230" stroke="#A78BFA" opacity=".6"></path><path d="M332 215 H360" stroke="#FBBF24"></path>
          <rect x="120" y="110" width="280" height="46" rx="10" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <circle cx="146" cy="133" r="11" stroke="#FFE4E6"></circle><path d="M168 126 H320 M168 140 H270" stroke="#FFE4E6"></path>
          <path d="M364 146 L378 180 L383 167 L396 163 Z" fill="#A78BFA" stroke="#A78BFA"></path>
        </g>
        <text x="200" y="288" textAnchor="middle" fill="#FB7185" fontFamily="Shadows Into Light" fontSize="22">TODAS TUS CONVERSACIONES</text>
      </g>
    </svg>
  )
}

export function DigestSketch({ className, digestTimeUpper }: SketchProps & { digestTimeUpper: string }) {
  return (
    <svg viewBox="0 0 420 300" width="100%" className={className} role="img" aria-label="Boceto: resumen de la mañana en WhatsApp">
      <g filter="url(#wk-glow)">
        <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="20" y="10" width="220" height="280" rx="24" stroke="#A78BFA"></rect>
          <path d="M110 26 H150" stroke="#A78BFA"></path>
          <circle cx="50" cy="54" r="12" stroke="#A78BFA"></circle>
          <path d="M70 50 H140 M70 62 H110" stroke="#A78BFA" opacity=".6"></path>
          <rect x="34" y="84" width="58" height="56" rx="10" stroke="#A78BFA"></rect>
          <rect x="100" y="84" width="58" height="56" rx="10" stroke="#A78BFA"></rect>
          <rect x="166" y="84" width="62" height="56" rx="10" fill="#FB7185" fillOpacity=".5" stroke="#FB7185"></rect>
          <rect x="34" y="156" width="194" height="96" rx="12" stroke="#A78BFA"></rect>
          <path d="M48 232 L76 220 L100 226 L130 204 L158 210 L186 188 L212 176" stroke="#FB7185"></path>
          <circle cx="212" cy="176" r="5" fill="#FB7185" stroke="#FB7185"></circle>
          <path d="M80 274 H180" stroke="#A78BFA" opacity=".5"></path>
          <path d="M316 150 C 318 186, 290 200, 244 196" stroke="#FBBF24" markerEnd="url(#wk-ahA)"></path>
        </g>
        <text x="63" y="122" textAnchor="middle" fill="#FAFAFA" fontFamily="Shadows Into Light" fontSize="26">38</text>
        <text x="129" y="122" textAnchor="middle" fill="#FAFAFA" fontFamily="Shadows Into Light" fontSize="26">14</text>
        <text x="197" y="120" textAnchor="middle" fill="#FFF1F2" fontFamily="Shadows Into Light" fontSize="20">$612k</text>
        <text x="48" y="178" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="17">AYER</text>
        <text x="262" y="50" fill="#FB7185" fontFamily="Shadows Into Light" fontSize="20">{digestTimeUpper}</text>
        <text x="262" y="102" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="24">ASÍ</text>
        <text x="262" y="128" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="24">AVANZASTE</text>
      </g>
    </svg>
  )
}

export function AgentConnector({ className, label }: SketchProps & { label: string }) {
  return (
    <svg viewBox="0 0 756 120" width="100%" className={className} aria-hidden="true" focusable="false">
      <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M24 12 C 24 80, 250 40, 300 104" stroke="#FB7185" markerEnd="url(#wk-ahC)"></path></g>
      <text x="318" y="72" fill="#FB7185" fontFamily="Shadows Into Light" fontSize="22">{label}</text>
    </svg>
  )
}

export function PanelConnector({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 756 120" width="100%" className={className} aria-hidden="true" focusable="false">
      <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M300 12 C 300 70, 90 40, 40 104" stroke="#A78BFA" markerEnd="url(#wk-ahV)"></path></g>
      <text x="320" y="56" fill="#A78BFA" fontFamily="Shadows Into Light" fontSize="22">Y TÚ LO VES TODO</text>
    </svg>
  )
}

export function WeekConnector({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 756 120" width="100%" className={className} aria-hidden="true" focusable="false">
      <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M600 12 C 600 80, 150 30, 90 104" stroke="#FBBF24" markerEnd="url(#wk-ahA)"></path></g>
      <text x="400" y="100" fill="#FBBF24" fontFamily="Shadows Into Light" fontSize="22">TU SEMANA, PASO A PASO</text>
    </svg>
  )
}

export function PlanConnector({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 756 120" width="100%" className={className} aria-hidden="true" focusable="false">
      <g filter="url(#wk-rough)" fill="none" strokeWidth="2" strokeLinecap="round"><path d="M40 12 C 40 76, 280 44, 330 104" stroke="#FB7185" markerEnd="url(#wk-ahC)"></path></g>
      <text x="350" y="74" fill="#FB7185" fontFamily="Shadows Into Light" fontSize="22">EL DÍA 7, TÚ DECIDES</text>
    </svg>
  )
}

/** El óvalo coral que rodea el precio. */
export function PriceOval({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 390 120" width="316" height="97" className={className} aria-hidden="true" focusable="false">
      <g filter="url(#wk-glow)"><g filter="url(#wk-rough)" fill="none" strokeLinecap="round"><path d="M34 62 C 30 20, 190 6, 330 20 C 384 28, 388 86, 330 98 C 230 116, 58 110, 32 82 C 20 68, 40 38, 96 28" stroke="#FB7185" strokeWidth="2.4"></path></g></g>
    </svg>
  )
}

/** El tachón a mano sobre el precio de lista. */
export function PriceStrike({ className }: SketchProps) {
  return (
    <svg viewBox="0 0 90 20" width="90" height="20" className={className} aria-hidden="true" focusable="false">
      <g filter="url(#wk-rough)"><path d="M2 14 C 30 8, 60 12, 88 4" fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round"></path></g>
    </svg>
  )
}
