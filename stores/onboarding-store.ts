import { create } from 'zustand'
import { OnboardingType } from '@/types/onboarding'

interface OnboardingState {
  step: number
  type: OnboardingType | null
  id: string | null
  formData: Record<string, unknown>
  fieldObservations: Record<string, string>
  setStep: (step: number) => void
  setType: (type: OnboardingType | null) => void
  setId: (id: string | null) => void
  updateFormData: (data: Partial<Record<string, unknown>>) => void
  setFieldObservations: (observations: Record<string, string>) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  type: null,
  id: null,
  formData: {},
  fieldObservations: {},
  setStep: (step) => set({ step }),
  setType: (type) => set({ type }),
  setId: (id) => set({ id }),
  updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  setFieldObservations: (fieldObservations) => set({ fieldObservations }),
  reset: () => set({ step: 1, type: null, id: null, formData: {}, fieldObservations: {} })
}))

