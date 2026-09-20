'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabaseClient'

interface RankingModalProps {
  onClose?: () => void
}

interface ScoreRecord {
  id?: string
  user_name: string
  points: number
  created_at?: string
}

export default function RankingModal({ onClose }: RankingModalProps) {
  const [scores, setScores] = useState<ScoreRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const { data, error } = await supabase
          .from('gunjin_scores')
          .select('*')
          .order('points', { ascending: false })
          .limit(10)

        if (data && !error) {
          setScores(data)
        }
      } catch (e) {
        console.warn('ランキング取得例外:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchScores()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#fcf8f2] border-4 border-[#c9a063] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black font-black text-xl px-2"
        >
          ✕
        </button>
        <h2 className="text-xl font-black text-[#b71c1c] mb-4 text-center border-b border-[#c9a063] pb-2">
          🏆 全国武将番付（ランキング）
        </h2>

        {loading ? (
          <p className="text-center text-xs font-bold text-gray-600 py-6">
            番付を取得中…
          </p>
        ) : scores.length === 0 ? (
          <p className="text-center text-xs font-bold text-gray-600 py-6">
            まだ戦功データがありません。対局を行って戦功を刻みましょう！
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {scores.map((s, idx) => (
              <div
                key={s.id || idx}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-[#a87c4f] shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950'
                        : idx === 1
                        ? 'bg-gray-300 text-gray-900'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {s.user_name || '名無しの武将'} 殿
                  </span>
                </div>
                <span className="text-sm font-black text-[#b71c1c]">
                  {s.points} pt
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-lg shadow border border-black text-xs"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}