import { useNavigate } from 'react-router-dom'

const DevTestButton = () => {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate('/test-sso')}
      className="fixed bottom-24 left-6 bg-tertiary text-white font-bold px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all active:scale-95 z-50"
      title="SSO Testing Tools"
    >
      <span className="material-symbols-outlined text-[20px]">science</span>
      <span className="text-sm">Test SSO</span>
    </button>
  )
}

export default DevTestButton
