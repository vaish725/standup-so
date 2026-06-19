import '../styles/globals.css'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata = {
  title: 'standup.so — brain dump to standup in 10 seconds',
  description: 'Turn your brain dump into a clean standup post in 10 seconds.'
}

export const viewport = {
  themeColor: '#ffffff'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} bg-background antialiased`}>
      <head>
        <script async src="https://cdn.novus.ai/tracker.js"></script>
        <script>
          window.novus = window.novus || function() { (window.novus.q = window.novus.q || []).push(arguments) };
          window.novus('init', 'YOUR_NOVUS_PROJECT_ID'); // Replace with actual project ID
          window.novus('track', 'page_open');
        </script>
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}
