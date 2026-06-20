declare module '*.css'
declare module '*.scss'
declare module '*.sass'

declare var pendo: any;

interface NovusFn {
  (...args: unknown[]): void
  q?: unknown[]
}

interface Window {
  novus?: NovusFn
}
