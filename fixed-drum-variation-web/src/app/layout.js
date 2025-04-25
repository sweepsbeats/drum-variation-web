import './globals.css'

export const metadata = {
  title: 'Drum Sample Variation Generator',
  description: 'Generate unique variations of drum samples in your browser',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
