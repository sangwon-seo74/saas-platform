'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/** 위험 작업 재인증 모달.
 *  사용자가 자신의 비밀번호를 다시 입력하도록 요구해 모종의 실수/세션 탈취를 방지한다.
 *  Supabase의 reauthenticate API가 패스워드 검증을 직접 지원하지 않으므로
 *  로컬에서 입력값과 사전 등록된 confirmation phrase(설정값)을 비교한다.
 *
 *  현재 단순화 구현: 사용자가 화면에 표시된 confirmation 단어를 그대로 타이핑.
 *  실제 운영 시 백엔드 reauthenticate API로 교체 권장. */
export function ConfirmModal({
  title, description, confirmWord = 'CONFIRM', onConfirm, onClose
}: {
  title: string
  description: string
  confirmWord?: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  const [input, setInput]   = useState('')
  const [busy, setBusy]     = useState(false)

  const handle = async () => {
    if (input !== confirmWord) return
    setBusy(true)
    await onConfirm()
    setBusy(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-red-700/40 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-white">{title}</h2>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">
            계속하려면 아래 단어를 정확히 입력하세요: <code className="text-red-400 font-mono">{confirmWord}</code>
          </p>
          <input
            value={input} onChange={e => setInput(e.target.value)} autoFocus
            placeholder={confirmWord}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700">
            취소
          </button>
          <button onClick={handle} disabled={input !== confirmWord || busy}
            className="flex-1 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
            {busy ? '처리 중...' : '확인 후 실행'}
          </button>
        </div>
      </div>
    </div>
  )
}
