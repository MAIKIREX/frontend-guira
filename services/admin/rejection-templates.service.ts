/**
 * rejection-templates.service.ts
 *
 * Servicio frontend para obtener y gestionar plantillas de rechazo/corrección.
 * Staff usa `getTemplates()` para poblar los quick-comment chips.
 * Admin usa los métodos CRUD para gestionar las plantillas.
 */
import { apiGet, apiPost, apiPatch } from '@/lib/api/client'

export interface RejectionTemplate {
  id: string
  category: string
  label: string
  body: string
  is_active: boolean
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── In-memory cache ──────────────────────────────────────────────────
// Templates rarely change during a session, so we cache per category.
const cache = new Map<string, { data: RejectionTemplate[]; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export const RejectionTemplatesService = {
  /**
   * Get active templates by category. Cached in-memory for 5 min.
   * Staff + admin can call this.
   */
  async getTemplates(category: string): Promise<RejectionTemplate[]> {
    const cached = cache.get(category)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data
    }

    const data = await apiGet<RejectionTemplate[]>(
      '/admin/rejection-templates',
      { params: { category } },
    )

    cache.set(category, { data, ts: Date.now() })
    return data
  },

  /**
   * Extract just the `body` strings for backward-compatible quick-comment chips.
   */
  async getQuickComments(category: string): Promise<string[]> {
    const templates = await this.getTemplates(category)
    return templates.map((t) => t.body)
  },

  /** Invalidate all cached templates (call after CRUD ops). */
  invalidateCache() {
    cache.clear()
  },

  // ── Admin CRUD ─────────────────────────────────────────────────────

  /**
   * List all templates (including inactive) for the admin management panel.
   */
  async getAllTemplates(category?: string): Promise<RejectionTemplate[]> {
    const params: Record<string, string> = {}
    if (category) params.category = category
    return apiGet<RejectionTemplate[]>('/admin/rejection-templates/all', { params })
  },

  /**
   * Create a new template.
   */
  async createTemplate(template: {
    category: string
    label: string
    body: string
    sort_order?: number
  }): Promise<RejectionTemplate> {
    const result = await apiPost<RejectionTemplate>('/admin/rejection-templates', template)
    this.invalidateCache()
    return result
  },

  /**
   * Update an existing template.
   */
  async updateTemplate(
    id: string,
    updates: { label?: string; body?: string; is_active?: boolean; sort_order?: number },
  ): Promise<RejectionTemplate> {
    const result = await apiPatch<RejectionTemplate>(`/admin/rejection-templates/${id}`, updates)
    this.invalidateCache()
    return result
  },

  /**
   * Soft-delete a template.
   */
  async deleteTemplate(id: string): Promise<void> {
    await apiPatch(`/admin/rejection-templates/${id}`, { is_active: false })
    this.invalidateCache()
  },
}
