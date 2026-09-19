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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)

    try {
      // 1. users テーブルから直接照会
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

      // 2. profiles テーブルから照会
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

      // 3. Supabase Auth での照会
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

      setLoginError('ユーザー名またはパスワードが一致しませんでした。')
    } catch (err) {
      console.error(err)
      setLoginError('ログイン処理中にエラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        13-LINEで利用している <strong>user_name</strong> と <strong>password</strong> を入力してください。
      </p>

      {loginError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {loginError}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          ユーザー名 (user_name)
        </label>
        <input
          type="text"
          required
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded focus:border-[#b71c1c] outline-none"
          placeholder="ユーザー名を入力"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          パスワード (password)
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border-2 border-gray-300 rounded focus:border-[#b71c1c] outline-none"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#b71c1c] hover:bg-[#8e0000] text-white font-bold py-3 rounded shadow-md border-2 border-black transition-colors disabled:opacity-50"
      >
        {loading ? '認証確認中...' : '13-LINEアカウントでログイン'}
      </button>
    </form>
  )
}