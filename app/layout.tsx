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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.novus = window.novus || function() { (window.novus.q = window.novus.q || []).push(arguments) };
              window.novus('init', '9bb510f7-b408-4fc8-92a2-db22ad05cd61'); // Replace with actual project ID
              window.novus('track', 'page_open');
            `
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}
