'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { OCCUPATION_OPTIONS } from '@/lib/bridge-constants'

// ─── Ocupaciones populares (las más frecuentes en la plataforma) ──────────────
const POPULAR_CODES = [
  '151252', // Software Developers
  '132011', // Accountants and Auditors
  '231011', // Lawyers
  '111021', // General and Operations Managers
  '291240', // General Physicians
  '412031', // Retail Salespersons
  '113031', // Financial Managers
  '541511', // Programadores (uses O*NET code from list)
  '999999', // Other
  '999998', // Not Specified
]

// ─── Categorías con emoji para agrupación visual ──────────────────────────────
interface OccupationCategory {
  emoji: string
  label: string
  range: [string, string] // [startCode, endCode] — prefijo numérico
}

const CATEGORIES: OccupationCategory[] = [
  { emoji: '👔', label: 'Gerencia y Dirección',         range: ['111', '119'] },
  { emoji: '💰', label: 'Finanzas y Negocios',          range: ['131', '132'] },
  { emoji: '💻', label: 'Ciencias e Ingeniería',        range: ['151', '172'] },
  { emoji: '🩺', label: 'Salud',                        range: ['291', '299'] },
  { emoji: '🎓', label: 'Educación',                    range: ['251', '254'] },
  { emoji: '⚖️', label: 'Legal',                        range: ['231', '232'] },
  { emoji: '🎨', label: 'Arte, Diseño y Media',         range: ['271', '274'] },
  { emoji: '🛒', label: 'Ventas',                       range: ['411', '419'] },
  { emoji: '🏢', label: 'Oficina y Administración',     range: ['431', '439'] },
  { emoji: '🔧', label: 'Instalación y Mantenimiento',  range: ['492', '499'] },
  { emoji: '🍳', label: 'Alimentos y Servicios',        range: ['351', '359'] },
  { emoji: '🏗️', label: 'Construcción',                 range: ['472', '472'] },
  { emoji: '🚛', label: 'Transporte',                   range: ['531', '536'] },
  { emoji: '🌾', label: 'Agricultura',                  range: ['452', '454'] },
  { emoji: '🛡️', label: 'Protección y Seguridad',       range: ['331', '332'] },
  { emoji: '🏥', label: 'Apoyo Sanitario',              range: ['311', '319'] },
  { emoji: '👥', label: 'Trabajo Social',               range: ['211', '211'] },
  { emoji: '🏠', label: 'Limpieza y Jardinería',        range: ['371', '393'] },
  { emoji: '🏭', label: 'Producción e Industria',       range: ['511', '514'] },
]

function getCategoryForCode(code: string): OccupationCategory | null {
  const prefix = code.substring(0, 3)
  return CATEGORIES.find(c => prefix >= c.range[0] && prefix <= c.range[1]) || null
}

// Construir mapa de opciones categorizadas (se ejecuta una sola vez)
function buildCategorizedOptions() {
  const popular = OCCUPATION_OPTIONS.filter(o => POPULAR_CODES.includes(o.value))
  
  const categorized = new Map<string, typeof OCCUPATION_OPTIONS[number][]>()
  const uncategorized: typeof OCCUPATION_OPTIONS[number][] = []

  for (const option of OCCUPATION_OPTIONS) {
    if (POPULAR_CODES.includes(option.value)) continue // ya están en populares
    const cat = getCategoryForCode(option.value)
    if (cat) {
      const key = `${cat.emoji} ${cat.label}`
      if (!categorized.has(key)) categorized.set(key, [])
      categorized.get(key)!.push(option)
    } else {
      uncategorized.push(option)
    }
  }

  return { popular, categorized, uncategorized }
}

const { popular, categorized, uncategorized } = buildCategorizedOptions()

// ─── Componente ───────────────────────────────────────────────────────────────
interface OccupationComboboxProps {
  value: string | undefined
  onChange: (value: string) => void
  disabled?: boolean
}

export function OccupationCombobox({ value, onChange, disabled }: OccupationComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(() => {
    if (!value) return null
    return OCCUPATION_OPTIONS.find(o => o.value === value)?.label || value
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-1.5 rounded-none border-0 border-b border-input bg-transparent py-0 pr-0 pl-0 text-sm tracking-[0.01em] whitespace-nowrap transition-colors outline-none select-none focus-visible:border-primary focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 h-11',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="truncate text-left flex-1">
          {selectedLabel || 'Selecciona tu ocupación'}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--anchor-width)] min-w-[340px] p-0"
        align="start"
        sideOffset={4}
      >
        <Command
          filter={(value, search) => {
            // Buscar por label (bilingüe) en vez de por value (código numérico)
            const option = OCCUPATION_OPTIONS.find(o => o.value === value)
            if (!option) return 0
            const haystack = option.label.toLowerCase()
            const needle = search.toLowerCase()
            // Búsqueda por cada palabra del query
            const words = needle.split(/\s+/)
            return words.every(w => haystack.includes(w)) ? 1 : 0
          }}
        >
          <CommandInput placeholder="Buscar ocupación..." />
          <CommandList>
            <CommandEmpty>No se encontraron ocupaciones.</CommandEmpty>

            {/* ── Populares ── */}
            <CommandGroup heading="⭐ Populares">
              {popular.map(o => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={(val) => {
                    onChange(val)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'size-4 shrink-0',
                      value === o.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* ── Categorías ── */}
            {Array.from(categorized.entries()).map(([categoryLabel, options]) => (
              <CommandGroup key={categoryLabel} heading={categoryLabel}>
                {options.map(o => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    onSelect={(val) => {
                      onChange(val)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        value === o.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}

            {/* ── Sin categoría ── */}
            {uncategorized.length > 0 && (
              <CommandGroup heading="📋 Otros">
                {uncategorized.map(o => (
                  <CommandItem
                    key={o.value}
                    value={o.value}
                    onSelect={(val) => {
                      onChange(val)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        value === o.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
