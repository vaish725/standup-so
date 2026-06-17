import './styles/globals.css'

export const metadata = {
  title: 'standup.so',
  description: 'Turn your brain dump into a clean standup post in 10 seconds.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  )
}
