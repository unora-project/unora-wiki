import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  isDark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
      toggle: () => set((state) => {
        const next = !state.isDark
        document.documentElement.classList.toggle('dark', next)
        return { isDark: next }
      }),
    }),
    { name: 'unora-theme' }
  )
)

// Initialize on load
const isDark = JSON.parse(localStorage.getItem('unora-theme') || '{}')?.state?.isDark
if (isDark !== undefined) {
  document.documentElement.classList.toggle('dark', isDark)
} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark')
}
