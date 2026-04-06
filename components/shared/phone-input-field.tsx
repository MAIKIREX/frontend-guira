'use client'

import { useEffect, useState } from 'react'
import Flag from 'react-world-flags'
import { ChevronDown } from 'lucide-react'
import {
  BRIDGE_COUNTRIES,
  COUNTRY_DIAL_CODES,
} from '@/lib/bridge-constants'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface PhoneInputFieldProps {
  /** Valor completo del teléfono en formato E.164 (ej: "+59175251822") */
  value: string
  onChange: (value: string) => void
  /** ISO alpha-3 del país seleccionado en el formulario (nationality o country_of_residence).
   *  Cuando cambia, se autodetecta el dial code. */
  countryHint?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * PhoneInputField
 * ---------------
 * Selector de código de país + input de número local.
 * El valor que almacena (y envía al backend) es siempre E.164: "+CCCNNNNNNNN".
 */
export function PhoneInputField({
  value,
  onChange,
  countryHint,
  placeholder = '75251822',
  disabled,
}: PhoneInputFieldProps) {
  // ── Separar prefijo y número local ────────────────────────────────
  const inferDialCode = (iso3: string | undefined): string => {
    if (iso3 && COUNTRY_DIAL_CODES[iso3]) return COUNTRY_DIAL_CODES[iso3]
    return '+1'
  }

  const parseFromE164 = (e164: string) => {
    // Intenta extraer el dial code del valor actual
    for (const country of BRIDGE_COUNTRIES) {
      const dc = COUNTRY_DIAL_CODES[country.value]
      if (dc && e164.startsWith(dc)) {
        return { dialCode: dc, local: e164.slice(dc.length) }
      }
    }
    return { dialCode: inferDialCode(countryHint), local: e164.replace(/^\+/, '') }
  }

  const [dialCode, setDialCode] = useState<string>(() => {
    if (value) return parseFromE164(value).dialCode
    return inferDialCode(countryHint)
  })
  const [localNumber, setLocalNumber] = useState<string>(() => {
    if (value) return parseFromE164(value).local
    return ''
  })
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  // ── Autodetectar desde countryHint ─────────────────────────────────
  useEffect(() => {
    if (countryHint) {
      const dc = inferDialCode(countryHint)
      setDialCode(dc)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryHint])

  // ── Sincronizar hacia el form parent ──────────────────────────────
  useEffect(() => {
    const clean = localNumber.replace(/\D/g, '')
    if (clean) {
      onChange(`${dialCode}${clean}`)
    } else {
      onChange('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialCode, localNumber])

  // ── Encontrar el ISO alpha-3 del dial code actual (para la bandera)
  const selectedCountry = BRIDGE_COUNTRIES.find(
    (c) => COUNTRY_DIAL_CODES[c.value] === dialCode,
  )

  const filtered = BRIDGE_COUNTRIES.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      (COUNTRY_DIAL_CODES[c.value] ?? '').includes(search),
  )

  return (
    <div className="flex gap-2">
      {/* ── Selector de código de país ── */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={(
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 shrink-0 h-10 min-w-[100px] font-mono text-sm',
              )}
            />
          )}
        >
          {selectedCountry ? (
            <Flag
              code={selectedCountry.value}
              fallback={<span>🌐</span>}
              style={{ width: 22, height: 15, objectFit: 'cover' }}
              className="rounded-sm"
            />
          ) : (
            <span className="text-base">🌐</span>
          )}
          <span>{dialCode}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
        </PopoverTrigger>

        <PopoverContent
          className="w-64 p-0"
          align="start"
          side="bottom"
          sideOffset={4}
        >
          {/* Búsqueda */}
          <div className="p-2 border-b">
            <Input
              autoFocus
              placeholder="Buscar país o código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <ScrollArea className="h-60">
            <div className="p-1">
              {filtered.map((country) => {
                const dc = COUNTRY_DIAL_CODES[country.value] ?? ''
                const isSelected = dialCode === dc && selectedCountry?.value === country.value
                return (
                  <button
                    key={country.value}
                    type="button"
                    onClick={() => {
                      setDialCode(dc)
                      setOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent hover:text-accent-foreground transition-colors',
                      isSelected && 'bg-accent text-accent-foreground font-medium',
                    )}
                  >
                    <Flag
                      code={country.value}
                      fallback={<span>🌐</span>}
                      style={{ width: 22, height: 15, objectFit: 'cover' }}
                      className="rounded-sm shrink-0"
                    />
                    <span className="flex-1 truncate">{country.label}</span>
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{dc}</span>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Sin resultados
                </p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* ── Input del número local ── */}
      <Input
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={localNumber}
        disabled={disabled}
        onChange={(e) => {
          // Solo dígitos, espacios y guiones
          const val = e.target.value.replace(/[^\d\s\-]/g, '')
          setLocalNumber(val)
        }}
        className="flex-1 font-mono"
      />
    </div>
  )
}
