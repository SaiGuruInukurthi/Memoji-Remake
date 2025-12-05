import dynamic from 'next/dynamic'

// Dynamic import with SSR disabled for client-only components
const MemojiApp = dynamic(() => import('@/components/MemojiApp'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">Memoji Clone</h1>
        <p className="text-gray-400">Loading application...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  return <MemojiApp />
}
