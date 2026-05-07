'use client'

import { motion } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════
   Guira Loading — Institutional Loading Screen
   ═══════════════════════════════════════════════════════════════
   Renders the Guira isotipo SVG inline with brand-accurate
   gradients (#00D8FF → #0051FF) and elegant animations.
   ═══════════════════════════════════════════════════════════════ */

const LOGO_GRADIENT_FROM = '#00D8FF'
const LOGO_GRADIENT_TO = '#0051FF'

/**
 * Inline SVG isotipo — renders the two interlocking Guira arrows
 * with the original linear gradients from the brand asset.
 */
function GuiraIsotipo({ size = 56 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 882 880"
      width={size}
      height={size}
      className="select-none"
    >
      <defs>
        <linearGradient id="g-loading-76" x1="1106" y1="126" x2="139" y2="1033" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={LOGO_GRADIENT_FROM} />
          <stop offset="1" stopColor={LOGO_GRADIENT_TO} />
        </linearGradient>
        <linearGradient id="g-loading-97" x1="574" y1="-159" x2="-147" y2="641" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={LOGO_GRADIENT_FROM} />
          <stop offset="1" stopColor={LOGO_GRADIENT_TO} />
        </linearGradient>
      </defs>
      {/* Bottom-right arrow */}
      <path
        fill="url(#g-loading-76)"
        d="M850.84,30.1l-377.85,377.9c-11.63,11.58-3.42,31.47,13.04,31.47h157.56c10.12,0,18.28,8.21,18.28,18.28v202.16H228.13c-4.53,0-8.87,1.8-12.08,5l-183.96,183.96c-11.6,11.6-3.38,31.44,13.02,31.44h550.07c42.69,0,83.63-16.96,113.82-47.15l151.99-151.42c13.2-13.15,20.61-31.01,20.61-49.64V43.09c0-16.36-19.19-24.57-30.77-12.99Z"
      />
      {/* Top-left arrow */}
      <path
        fill="url(#g-loading-97)"
        d="M617.24,0H240.19c-12.7,0-24.89,5.05-33.87,14.03l-17.14,17.14-1.55,1.58-7.37,7.39L33.82,186.58C12.17,208.23,0,237.6,0,268.22v30.59c0,.09,0,.17,0,.26v318.41c0,16.14,19.51,24.22,30.92,12.81l184.86-184.86c2.96-2.96,4.63-6.98,4.63-11.17v-213.86h213.1c4.68,0,9.16-1.86,12.44-5.14L630.23,31.47c11.63-11.63,3.42-31.47-12.99-31.47Z"
      />
    </svg>
  )
}

/* ── Animation presets ── */
const GENTLE_SPRING = { type: 'spring' as const, stiffness: 60, damping: 18 }

/**
 * GuiraLoading — Full-screen or inline loading indicator with brand identity.
 *
 * Features:
 *  • Inline SVG isotipo with original gradient colors
 *  • Subtle breathing scale + ambient glow pulse
 *  • Smooth shimmer progress bar (#00D8FF → #0051FF)
 *  • Staggered animated dots
 *  • Backdrop blur for fullscreen overlay mode
 */
export function GuiraLoading({
  size = 56,
  text = 'Cargando',
  fullScreen = true,
}: {
  size?: number
  text?: string
  fullScreen?: boolean
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-7 ${
        fullScreen
          ? 'fixed inset-0 z-50 bg-background/90 backdrop-blur-xl'
          : 'py-16'
      }`}
    >
      {/* ── Isotipo with ambient glow & breathing ── */}
      <div className="relative flex items-center justify-center">
        {/* Ambient glow behind logo */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 2.2,
            height: size * 2.2,
            background: `radial-gradient(circle, ${LOGO_GRADIENT_FROM}18 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Outer ring — slow rotation */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size + 28,
            height: size + 28,
            border: `1.5px solid transparent`,
            borderTopColor: LOGO_GRADIENT_FROM,
            borderRightColor: `${LOGO_GRADIENT_TO}60`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner ring — counter-rotation */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size + 14,
            height: size + 14,
            border: `1px solid transparent`,
            borderBottomColor: `${LOGO_GRADIENT_TO}40`,
            borderLeftColor: `${LOGO_GRADIENT_FROM}30`,
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 3.8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Logo — gentle breathing */}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ filter: `drop-shadow(0 0 20px ${LOGO_GRADIENT_TO}30)` }}
        >
          <GuiraIsotipo size={size} />
        </motion.div>
      </div>

      {/* ── Text + animated dots ── */}
      <div className="flex items-center gap-1.5">
        <span
          className="text-[13px] font-semibold tracking-[0.08em] uppercase"
          style={{ color: LOGO_GRADIENT_TO }}
        >
          {text}
        </span>
        <span className="flex gap-[3px] ml-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="inline-block w-[5px] h-[5px] rounded-full"
              style={{ backgroundColor: LOGO_GRADIENT_TO }}
              animate={{ opacity: [0.15, 1, 0.15], y: [0, -4, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </span>
      </div>

      {/* ── Shimmer progress bar ── */}
      <div
        className="overflow-hidden rounded-full"
        style={{
          width: size * 2.8,
          height: 3,
          backgroundColor: `${LOGO_GRADIENT_TO}12`,
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${LOGO_GRADIENT_FROM}, ${LOGO_GRADIENT_TO}, transparent)`,
            width: '50%',
          }}
          animate={{ x: ['-100%', '250%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}

/**
 * GuiraLoadingInline — Compact version for use inside cards / sections.
 * Does NOT overlay the full screen.
 */
export function GuiraLoadingInline({
  size = 40,
  text = 'Cargando',
}: {
  size?: number
  text?: string
}) {
  return <GuiraLoading size={size} text={text} fullScreen={false} />
}
