import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import '../styles/globals.css'
import Layout from '../components/Layout'
import { ReactQueryProvider } from '../lib/react-query'
import { ChatProvider } from '../context/ChatProvider'
import { ChatWidget } from '../components/chat/ChatWidget'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ReactQueryProvider>
        <ChatProvider>
          <Layout>
            <Component {...pageProps} />
            <ChatWidget />
          </Layout>
        </ChatProvider>
      </ReactQueryProvider>
    </SessionProvider>
  )
}
