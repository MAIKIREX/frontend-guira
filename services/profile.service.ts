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
  async getProfile(token?: string): Promise<Profile> {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    return apiGet<Profile>('/profiles/me', config)
  },

  /**
   * Actualiza el avatar del perfil del usuario autenticado.
   */
  async updateProfile(updates: { avatar_url?: string }): Promise<Profile> {
    return apiPatch<Profile>('/profiles/me', updates)
  },

  /**
   * Consigue una URL firmada de Supabase para subir el avatar directamente
   */
  async getAvatarUploadUrl(fileName: string): Promise<{ upload_url: string; path: string }> {
    return apiGet<{ upload_url: string; path: string }>(`/profiles/me/avatar-upload-url?fileName=${encodeURIComponent(fileName)}`)
  },

  /**
   * Sube la imagen a la URL firmada.
   */
  async uploadAvatarBinary(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })
    if (!res.ok) {
      throw new Error('No se pudo subir la imagen del avatar')
    }
  },

  /**
   * Obtiene configuración pública de la plataforma (sin auth).
   * Útil para mostrar fees, tasas, etc. antes del login.
   */
  async getPublicSettings(): Promise<Record<string, string>> {
    return apiGet<Record<string, string>>('/settings/public')
  },
}
