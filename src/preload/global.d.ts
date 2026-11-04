import type { SouthAstraApi } from '../shared/types'

declare global {
  interface Window {
    southastra: SouthAstraApi
  }
}

export {}
