'use client'

import { AlertCircle } from 'lucide-react'

/**
 * Inline alert that displays a staff observation for a specific form field.
 * Renders below the form input when the field has a pending observation.
 *
 * Usage:
 *   <FieldObservationAlert fieldName="address1" fieldObservations={fieldObservations} />
 */
export function FieldObservationAlert({
  fieldName,
  fieldObservations,
}: {
  fieldName: string
  fieldObservations: Record<string, string>
}) {
  const message = fieldObservations[fieldName]
  if (!message) return null

  return (
    <div className="flex items-start gap-1.5 mt-1 px-1">
      <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
        {message}
      </p>
    </div>
  )
}
