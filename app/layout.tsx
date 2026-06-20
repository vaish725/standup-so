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
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track','trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('9bb510f7-b408-4fc8-92a2-db22ad05cd61');

pendo.initialize({ visitor: { id: '' } });
            `
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  )
}
