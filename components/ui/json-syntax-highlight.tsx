'use client'

/**
 * JsonSyntaxHighlight — visor JSON de solo lectura con colores.
 *
 * Renderiza JSON formateado con:
 *  - Keys en azul claro
 *  - Strings en verde
 *  - Números en naranja
 *  - Booleans en morado
 *  - Null en gris
 *  - Puntuación en gris tenue
 *
 * Sin dependencias externas, sin íconos molestos, sin collapse/expand.
 * Solo lectura limpia y profesional.
 */

import { useMemo } from 'react'

// Paleta de colores para dark backgrounds
const COLORS = {
  key: '#7dd3fc',      // sky-300
  string: '#86efac',   // green-300
  number: '#fdba74',   // orange-300
  boolean: '#67e8f9',  // cyan-300
  null: '#6b7280',     // gray-500
  bracket: '#9ca3af',  // gray-400
  punctuation: '#6b7280',
} as const

interface JsonSyntaxHighlightProps {
  data: unknown
  className?: string
}

export function JsonSyntaxHighlight({ data, className }: JsonSyntaxHighlightProps) {
  const highlighted = useMemo(() => {
    const raw = JSON.stringify(data, null, 2)
    return colorize(raw)
  }, [data])

  return (
    <pre
      className={className}
      style={{
        margin: 0,
        fontSize: '12.5px',
        lineHeight: '1.65',
        fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        tabSize: 2,
      }}
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  )
}

function colorize(json: string): string {
  // Regex that matches JSON tokens in order:
  //  1. Keys (quoted strings followed by ":")
  //  2. String values
  //  3. Numbers
  //  4. true / false
  //  5. null
  //  6. Structural characters: { } [ ] , :
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)|("(?:\\.|[^"\\])*")|([-+]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false)|(null)|([{}\[\],:])/g,
    (match, key, colon, str, num, bool, nul, struct) => {
      if (key !== undefined) {
        // key: value  →  colorize key + colon
        const cleanKey = key.slice(1, -1) // remove quotes
        return `<span style="color:${COLORS.key}">"${escapeHtml(cleanKey)}"</span><span style="color:${COLORS.punctuation}">:</span>`
      }
      if (str !== undefined) {
        const inner = str.slice(1, -1)
        return `<span style="color:${COLORS.string}">"${escapeHtml(inner)}"</span>`
      }
      if (num !== undefined) {
        return `<span style="color:${COLORS.number}">${escapeHtml(num)}</span>`
      }
      if (bool !== undefined) {
        return `<span style="color:${COLORS.boolean}">${bool}</span>`
      }
      if (nul !== undefined) {
        return `<span style="color:${COLORS.null};font-style:italic">null</span>`
      }
      if (struct !== undefined) {
        return `<span style="color:${COLORS.bracket}">${struct}</span>`
      }
      return match
    },
  )
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
