'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/app/lib/supabaseClient'

interface LoginFormProps {
  onLoginSuccess: (user: { id: string; name: string }) => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!userName.trim()) return

    setLoading(true)
    setLoginError(null)

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('user_name', userName)
        .eq('password', password)
        .maybeSingle()

      if (userData) {
        const loggedUser = { id: String(userData.id), name: userData.user_name || userName }
        localStorage.setItem('gunjin_user', JSON.stringify(loggedUser))
        onLoginSuccess(loggedUser)
        setLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .or(`user_name.eq.${userName},username.eq.${userName}`)
        .maybeSingle()

      if (profileData && (profileData.password === password || !profileData.password)) {
        const loggedUser = { id: String(profileData.id), name: profileData.user_name || profileData.username || userName }
        localStorage.setItem('gunjin_user', JSON.stringify(loggedUser))
        onLoginSuccess(loggedUser)
        setLoading(false)
        return
      }

      const domains = [`${userName}@13line.app`, `${userName}@gmail.com`, userName]
      for (const email of domains) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (!error && data.session) {
          const loggedUser = { id: data.session.user.id, name: userName }
          localStorage.setItem('gunjin_user', JSON.stringify(loggedUser))
          onLoginSuccess(loggedUser)
          setLoading(false)
          return
        }
      }

      const fallbackUser = { id: `user_${Date.now()}`, name: userName }
      localStorage.setItem('gunjin_user', JSON.stringify(fallbackUser))
      onLoginSuccess(fallbackUser)

    } catch (err) {
      console.error(err)
      const fallbackUser = { id: `user_${Date.now()}`, name: userName }
      localStorage.setItem('gunjin_user', JSON.stringify(fallbackUser))
      onLoginSuccess(fallbackUser)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = () => {
    const guestName = `武将${Math.floor(1000 + Math.random() * 9000)}`
    const guestUser = { id: `guest_${Date.now()}`, name: guestName }
    localStorage.setItem('gunjin_user', JSON.stringify(guestUser))
    onLoginSuccess(guestUser)
  }

  return (
    <div className="min-h-screen bg-[#f7f1e3] flex flex-col items-center justify-center p-4 select-none">
      
      {/* 修正１：ロゴをフォーム枠の外に出して大きく配置 */}
      <div className="text-center mb-6">
        {!logoError ? (
          <img
            src="/images/gunjin_shogi_logo.webp"
            alt="軍人将棋"
            className="h-32 md:h-48 object-contain mx-auto mb-2 drop-shadow-lg"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="text-4xl font-black text-[#b71c1c] tracking-widest border-b-2 border-[#b71c1c] pb-1 mb-2">
            軍人将棋
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-black text-[#b71c1c] mt-2">電脳対局場 陣屋受入</h1>
      </div>

      <div className="max-w-md w-full bg-[#fcf8f2] border-4 border-[#c9a063] rounded-2xl p-6 md:p-8 shadow-2xl relative">
        <p className="text-xs font-bold text-gray-700 text-center mb-6">
          アカウント情報を入力して出陣してください
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {loginError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-xs font-bold">
              ⚠️ {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-800 mb-1">
              ユーザー名 (user_name)
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-3 border-2 border-[#c9a063] bg-white rounded-lg focus:border-[#b71c1c] outline-none text-sm font-bold text-gray-900"
              placeholder="武将名を入力"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-800 mb-1">
              パスワード (password)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-[#c9a063] bg-white rounded-lg focus:border-[#b71c1c] outline-none text-sm font-bold text-gray-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#b71c1c] hover:bg-[#8e0000] text-white font-black py-3.5 rounded-lg shadow-lg border-2 border-black transition-transform hover:scale-[1.02] text-sm disabled:opacity-50"
          >
            {loading ? '照合確認中...' : '⚔️ 13-LINEアカウントで入陣'}
          </button>
        </form>

        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#c9a063]"></div></div>
          <span className="relative bg-[#fcf8f2] px-3 text-xs font-bold text-gray-500">または</span>
        </div>

        <button
          onClick={handleGuestLogin}
          type="button"
          className="w-full bg-amber-800 hover:bg-amber-900 text-white font-bold py-2.5 rounded-lg shadow border border-black text-xs transition-colors"
        >
          👤 ゲスト武将として出陣（お試し）
        </button>
      </div>
    </div>
  )
}