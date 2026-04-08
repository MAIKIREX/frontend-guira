'use client'

import { useEffect, useState } from 'react'

export function useSignedUrl(url?: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(url || undefined)

  useEffect(() => {
    if (!url) {
      setSignedUrl(undefined)
      return
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      setSignedUrl(url)
      return
    }

    async function fetchSignedUrl() {
      try {
        const { createClient } = await import('@/lib/supabase/browser')
        const supabase = createClient()
        
        const parts = url!.split('/')
        if (parts.length < 2) {
          setSignedUrl(url!)
          return
        }
        
        const bucket = parts[0]
        const path = parts.slice(1).join('/')
        
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60)
        
        if (error) {
          console.error('[useSignedUrl] Error signing url:', error)
          setSignedUrl(url!)
        } else if (data?.signedUrl) {
          setSignedUrl(data.signedUrl)
        } else {
          setSignedUrl(url!)
        }
      } catch (err) {
        console.error('[useSignedUrl] Error loading url:', err)
        setSignedUrl(url!)
      }
    }

    fetchSignedUrl()
  }, [url])

  return signedUrl
}
