'use client'

const pieces = [
  '大将', '中将', '少将', '飛行機', 'タンク', '大佐', '中佐', '少佐', '大尉', '中尉', '少尉', '騎兵', '工兵', 'スパイ', '地雷'
]

// 星取り表に完全準拠したデータ (行:攻撃側, 列:守備側)
const matrix = [
  ['-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '×', '-'], // 大将
  ['×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '-'], // 中将
  ['×', '×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '-'], // 少将
  ['×', '×', '×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇'], // 飛行機
  ['×', '×', '×', '×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '×', '〇', '-'], // タンク
  ['×', '×', '×', '×', '×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '-'], // 大佐
  ['×', '×', '×', '×', '×', '×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '〇', '-'], // 中佐
  ['×', '×', '×', '×', '×', '×', '×', '-', '〇', '〇', '〇', '〇', '〇', '〇', '-'], // 少佐
  ['×', '×', '×', '×', '×', '×', '×', '×', '-', '〇', '〇', '〇', '〇', '〇', '-'], // 大尉
  ['×', '×', '×', '×', '×', '×', '×', '×', '×', '-', '〇', '〇', '〇', '〇', '-'], // 中尉
  ['×', '×', '×', '×', '×', '×', '×', '×', '×', '×', '-', '〇', '〇', '〇', '-'], // 少尉
  ['×', '×', '×', '×', '×', '×', '×', '×', '×', '×', '×', '-', '〇', '〇', '-'], // 騎兵
  ['×', '×', '×', '×', '〇', '×', '×', '×', '×', '×', '×', '×', '-', '〇', '〇'], // 工兵
  ['〇', '×', '×', '×', '×', '×', '×', '×', '×', '×', '×', '×', '×', '-', '-'], // スパイ
  ['-', '-', '-', '×', '-', '-', '-', '-', '-', '-', '-', '-', '×', '-', '-'], // 地雷
]

export default function RuleGuide() {
  return (
    <div className="max-w-4xl mx-auto bg-[#fcf8f2] border-4 border-[#c9a063] rounded-2xl p-4 md:p-6 shadow-2xl font-sans select-none text-gray-900 mt-6">
      
      <div className="bg-gradient-to-r from-[#5c0606] via-[#b71c1c] to-[#5c0606] text-amber-100 p-3 md:p-4 rounded-xl text-center shadow-lg border-2 border-amber-500 mb-6">
        <h2 className="text-lg md:text-2xl font-black tracking-widest text-amber-300 drop-shadow">
          📜 軍人将棋（23枚型）ルール・相克表ガイド
        </h2>
      </div>

      {/* 駒の動き方一覧 */}
      <div className="mb-8">
        <h3 className="text-base font-black text-[#b71c1c] border-b-2 border-[#c9a063] pb-1 mb-3">
          ♟️ 駒の動き方
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm text-gray-800 font-bold">
          
          <div className="bg-white p-3 border-2 border-[#c9a063] rounded-lg shadow-sm flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 border border-amber-300 rounded flex items-center justify-center text-red-600 font-black text-lg shrink-0">┼</div>
            <div>
              <span className="text-[#b71c1c] font-black text-sm">将官・佐官・尉官・スパイ</span><br/>
              前後左右に <span className="text-blue-700 bg-blue-50 px-1 rounded">1マス</span> 進める。
            </div>
          </div>

          <div className="bg-white p-3 border-2 border-[#c9a063] rounded-lg shadow-sm flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 border border-amber-300 rounded flex flex-col items-center justify-center text-red-600 font-black text-[9px] leading-tight shrink-0">
              <span>▲ ∝</span><span>◄ ● ►</span><span>▼ 1</span>
            </div>
            <div>
              <span className="text-[#b71c1c] font-black text-sm">飛行機（ヒコーキ）</span><br/>
              前・左右に <span className="text-blue-700 bg-blue-50 px-1 rounded">何マスでも</span>、後ろに <span className="text-blue-700 bg-blue-50 px-1 rounded">1マス</span>。<br/>
              <span className="text-red-600 text-[11px]">※途中の駒（味方・敵）を飛び越えられる。</span>
            </div>
          </div>

          <div className="bg-white p-3 border-2 border-[#c9a063] rounded-lg shadow-sm flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 border border-amber-300 rounded flex flex-col items-center justify-center text-red-600 font-black text-[9px] leading-tight shrink-0">
              <span>▲ 2</span><span>◄ ● ►</span><span>▼ 1</span>
            </div>
            <div>
              <span className="text-[#b71c1c] font-black text-sm">タンク・騎兵</span><br/>
              前に <span className="text-blue-700 bg-blue-50 px-1 rounded">2マス</span>、後ろ・左右に <span className="text-blue-700 bg-blue-50 px-1 rounded">1マス</span> 進める。
            </div>
          </div>

          <div className="bg-white p-3 border-2 border-[#c9a063] rounded-lg shadow-sm flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 border border-amber-300 rounded flex items-center justify-center text-red-600 font-black text-xl shrink-0">✛</div>
            <div>
              <span className="text-[#b71c1c] font-black text-sm">工兵</span><br/>
              前後左右に <span className="text-blue-700 bg-blue-50 px-1 rounded">何マスでも</span> 直進できる。<br/>
              <span className="text-gray-500 text-[11px]">（駒の飛び越えは不可）</span>
            </div>
          </div>

          <div className="bg-white p-3 border-2 border-[#c9a063] rounded-lg shadow-sm md:col-span-2 flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-200 border border-gray-400 rounded flex items-center justify-center text-gray-500 font-black text-xl shrink-0">✖</div>
            <div>
              <span className="text-gray-700 font-black text-sm">地雷・軍旗</span><br/>
              自分からは動けない。<br/>
              <span className="text-[#b71c1c] text-[11px]">※軍旗は「すぐ後ろの味方の駒」と同じ強さになる。</span>
            </div>
          </div>
        </div>
      </div>

      {/* 勝ち負け早見表 */}
      <div>
        <h3 className="text-base font-black text-[#b71c1c] border-b-2 border-[#c9a063] pb-1 mb-3">
          ⚔️ 23枚型 勝ち負け早見表
        </h3>
        <p className="text-xs font-bold text-gray-600 mb-2 bg-amber-100 p-1.5 rounded inline-block border border-amber-300">
          <span className="text-red-600 text-sm font-black mr-1">〇</span>攻撃側の勝ち &nbsp;
          <span className="text-blue-600 text-sm font-black mx-1">×</span>攻撃側の負け &nbsp;
          <span className="text-gray-500 text-sm font-black mx-1">-</span>相打ち（両方除去）
        </p>
        
        <div className="overflow-x-auto border-2 border-[#8b5a2b] rounded-lg shadow-inner bg-white mt-1">
          <table className="w-full min-w-max border-collapse text-xs md:text-sm text-center">
            <thead>
              <tr className="bg-gradient-to-b from-amber-200 to-amber-300">
                <th className="border border-[#c9a063] p-1.5 md:p-2 sticky left-0 bg-amber-300 z-10 font-black text-amber-950 shadow-sm">
                  攻撃側 ↓
                </th>
                {pieces.map(p => (
                  <th key={p} className="border border-[#c9a063] p-1.5 font-black text-amber-950">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={pieces[i]} className="hover:bg-amber-50 transition-colors">
                  <th className="border border-[#c9a063] p-1.5 md:p-2 sticky left-0 bg-amber-100 z-10 font-black text-gray-800 shadow-sm">
                    {pieces[i]}
                  </th>
                  {row.map((result, j) => (
                    <td key={j} className="border border-gray-300 p-1.5 md:p-2 font-black">
                      {result === '〇' ? (
                        <span className="text-red-600 text-base drop-shadow-sm">〇</span>
                      ) : result === '×' ? (
                        <span className="text-blue-600 text-base drop-shadow-sm">×</span>
                      ) : (
                        <span className="text-gray-400 font-bold">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}