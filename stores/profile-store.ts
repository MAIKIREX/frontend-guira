import { create } from 'zustand'
import { Profile } from '@/types/profile'

interface ProfileState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}))
