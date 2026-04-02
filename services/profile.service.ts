/**
 * profile.service.ts
 * 
 * MIGRADO: Supabase direct → REST API (GET /profiles/me, PATCH /profiles/me)
 * 
 * Antes: supabase.from('profiles').select().eq('id', userId)
 * Ahora: apiGet('/profiles/me') — el backend filtra por JWT automáticamente
 */
import { apiGet, apiPatch } from '@/lib/api/client'
import type { Profile } from '@/types/profile'

export const ProfileService = {
  /**
   * Obtiene el perfil del usuario autenticado.
   * El backend extrae el userId del JWT (no se pasa como parámetro).
   */
  async getProfile(): Promise<Profile> {
    return apiGet<Profile>('/profiles/me')
  },

  /**
   * Actualiza campos parciales del perfil del usuario autenticado.
   */
  async updateProfile(updates: Partial<Pick<Profile, 'full_name'>>): Promise<Profile> {
    return apiPatch<Profile>('/profiles/me', updates)
  },

  /**
   * Obtiene configuración pública de la plataforma (sin auth).
   * Útil para mostrar fees, tasas, etc. antes del login.
   */
  async getPublicSettings(): Promise<Record<string, string>> {
    return apiGet<Record<string, string>>('/settings/public')
  },
}
