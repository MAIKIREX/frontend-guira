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
  '151252', // Software Developer
  '132011', // Accountant and Auditor
  '231011', // Lawyer
  '111021', // General and Operations Manager
  '291141', // Registered Nurse
  '412031', // Retail Salesperson
  '113031', // Financial Manager
  '151251', // Computer Programmer
  '434051', // Customer Service Representative
  '999999', // Unemployed / Other
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
  { emoji: '💻', label: 'Computación y Tecnología',     range: ['151', '151'] },
  { emoji: '📐', label: 'Matemáticas',                  range: ['152', '152'] },
  { emoji: '🔬', label: 'Ingeniería',                   range: ['171', '173'] },
  { emoji: '🧪', label: 'Ciencias Naturales',           range: ['191', '195'] },
  { emoji: '👥', label: 'Trabajo Social y Consejería',  range: ['211', '212'] },
  { emoji: '🎓', label: 'Educación',                    range: ['251', '259'] },
  { emoji: '⚖️', label: 'Legal',                        range: ['231', '232'] },
  { emoji: '🎨', label: 'Arte, Diseño y Media',         range: ['271', '274'] },
  { emoji: '🩺', label: 'Salud — Profesionales',        range: ['291', '292'] },
  { emoji: '🏥', label: 'Apoyo Sanitario',              range: ['299', '319'] },
  { emoji: '🛡️', label: 'Protección y Seguridad',       range: ['331', '339'] },
  { emoji: '🍳', label: 'Alimentos y Servicios',        range: ['351', '359'] },
  { emoji: '🧹', label: 'Limpieza y Jardinería',        range: ['371', '373'] },
  { emoji: '✂️', label: 'Cuidado Personal',             range: ['391', '399'] },
  { emoji: '🛒', label: 'Ventas',                       range: ['411', '419'] },
  { emoji: '🏢', label: 'Oficina y Administración',     range: ['431', '439'] },
  { emoji: '🌾', label: 'Agricultura',                  range: ['451', '454'] },
  { emoji: '🏗️', label: 'Construcción y Extracción',    range: ['471', '475'] },
  { emoji: '🔧', label: 'Instalación y Mantenimiento',  range: ['491', '499'] },
  { emoji: '🏭', label: 'Producción',                   range: ['511', '519'] },
  { emoji: '🚛', label: 'Transporte y Carga',           range: ['531', '537'] },
  { emoji: '🎖️', label: 'Militar',                      range: ['551', '554'] },
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
