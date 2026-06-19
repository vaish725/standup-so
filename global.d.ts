declare module '*.css'
declare module '*.scss'
declare module '*.sass'

interface NovusFn {
  (...args: unknown[]): void
  q?: unknown[]
}

interface Window {
  novus?: NovusFn
}
