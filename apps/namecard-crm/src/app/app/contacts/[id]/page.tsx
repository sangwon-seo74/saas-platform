'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Phone, Mail, MapPin, Star, ArrowLeft,
  Plus, Loader2, Building2, Edit2, X, Tag,
} from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import type { Contact, Activity, ActivityType, BusinessCard, Tag as TagType } from '@/types/domain'
import { ACTIVITY_TYPE_LABEL } from '@/types/domain'

const ACTIVITY_TYPES: ActivityType[] = ['memo', 'call', 'visit', 'consultation']

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id ?? '') as string

  const [contact,    setContact]    = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [card,       setCard]       = useState<BusinessCard | null>(null)
  const [allTags,    setAllTags]    = useState<TagType[]>([])
  const [loading,    setLoading]    = useState(true)

  const [showAddActivity,  setShowAddActivity]  = useState(false)
  const [activityType,     setActivityType]     = useState<ActivityType>('memo')
  const [activityContent,  setActivityContent]  = useState('')
  const [submitting,       setSubmitting]        = useState(false)

  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagLoading,    setTagLoading]    = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [cRes, aRes, bcRes, tRes] = await Promise.all([
      fetch(`/api/contacts/${id}`).then(r => r.json()),
      fetch(`/api/activities?contact_id=${id}`).then(r => r.json()),
      fetch(`/api/business-cards?contact_id=${id}`).then(r => r.json()),
      fetch('/api/tags').then(r => r.json()),
    ])
    setContact(cRes.data)
    setActivities(aRes.data?.data ?? [])
    setCard(bcRes.data ?? null)
    setAllTags(tRes.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { if (id) fetchAll() }, [id, fetchAll])

  async function toggleVip() {
    if (!contact) return
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_vip: !contact.is_vip }),
    })
    setContact(c => c ? { ...c, is_vip: !c.is_vip } : c)
  }

  async function addActivity() {
    if (!activityContent.trim()) return
    setSubmitting(true)
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: id, type: activityType, content: activityContent }),
    })
    setActivityContent('')
    setShowAddActivity(false)
    setSubmitting(false)
    await fetchAll()
  }

  async function addTag(tagId: string) {
    if (!contact) return
    setTagLoading(true)
    await fetch(`/api/contacts/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId }),
    })
    setShowTagPicker(false)
    setTagLoading(false)
    await fetchAll()
  }

  async function removeTag(tagId: string) {
    setTagLoading(true)
    await fetch(`/api/contacts/${id}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId }),
    })
    setTagLoading(false)
    await fetchAll()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-dk-muted" /></div>
  }

  if (!contact) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-dk-muted">고객을 찾을 수 없습니다</p>
        <button onClick={() => router.back()} className="text-sm text-dk-blue hover:underline">뒤로 가기</button>
      </div>
    )
  }

  const mapQuery = encodeURIComponent(contact.company?.name ?? contact.name)
  const currentTagIds = new Set((contact.tags ?? []).map(t => t.id))
  const unassignedTags = allTags.filter(t => !currentTagIds.has(t.id))

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg text-dk-dim hover:text-dk-muted hover:bg-dk-surface2 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-dk-text">{contact.name}</h1>
            <button onClick={toggleVip} className={cn('p-1 rounded transition-colors', contact.is_vip ? 'text-dk-orange' : 'text-dk-dim hover:text-dk-orange')}>
              <Star className={cn('w-4 h-4', contact.is_vip && 'fill-dk-orange')} />
            </button>
          </div>
          {contact.company && <p className="text-sm text-dk-muted">{contact.company.name}{contact.title ? ` · ${contact.title}` : ''}</p>}
        </div>
        <Link
          href={`/app/contacts/${id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-dk-border text-dk-muted rounded-lg hover:bg-dk-surface2 transition-colors shrink-0"
        >
          <Edit2 className="w-3.5 h-3.5" />수정
        </Link>
      </div>

      {/* 빠른 실행 */}
      <div className="grid grid-cols-4 gap-2">
        {contact.mobile && (
          <a href={`tel:${contact.mobile}`} className="flex flex-col items-center gap-1.5 p-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
            <Phone className="w-5 h-5 text-dk-green" />
            <span className="text-[10px] text-dk-muted">전화</span>
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex flex-col items-center gap-1.5 p-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
            <Mail className="w-5 h-5 text-dk-blue" />
            <span className="text-[10px] text-dk-muted">이메일</span>
          </a>
        )}
        {contact.mobile && (
          <a href={`kakaoplus://talk?phone=${contact.mobile}`} className="flex flex-col items-center gap-1.5 p-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FEE500"><path d="M12 3C6.477 3 2 6.824 2 11.5c0 2.968 1.837 5.56 4.607 7.115L5.5 21.5l3.273-2.048C9.84 19.807 10.906 20 12 20c5.523 0 10-3.824 10-8.5S17.523 3 12 3z"/></svg>
            <span className="text-[10px] text-dk-muted">카카오톡</span>
          </a>
        )}
        {contact.company && (
          <a href={`https://map.kakao.com/?q=${mapQuery}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 p-3 bg-dk-surface border border-dk-border rounded-xl hover:bg-dk-surface2 transition-colors">
            <MapPin className="w-5 h-5 text-dk-red" />
            <span className="text-[10px] text-dk-muted">길찾기</span>
          </a>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* 담당자 정보 */}
        <section className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-dk-dim uppercase tracking-wider">담당자 정보</h2>
          <InfoRow label="이름"   value={contact.name} />
          <InfoRow label="부서"   value={contact.department} />
          <InfoRow label="직책"   value={contact.title} />
          <InfoRow label="휴대폰" value={contact.mobile} href={contact.mobile ? `tel:${contact.mobile}` : undefined} />
          <InfoRow label="팩스"   value={contact.fax} />
          <InfoRow label="이메일" value={contact.email} href={contact.email ? `mailto:${contact.email}` : undefined} />
        </section>

        {/* 회사 정보 */}
        <section className="bg-dk-surface border border-dk-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-dk-dim uppercase tracking-wider">회사 정보</h2>
            {contact.company && <Building2 className="w-4 h-4 text-dk-dim" />}
          </div>
          {contact.company ? (
            <>
              <InfoRow label="회사명"   value={contact.company.name} />
              <InfoRow label="주소"     value={contact.company.address} />
              <InfoRow label="홈페이지" value={contact.company.website} href={contact.company.website ?? undefined} />
              <InfoRow label="대표번호" value={contact.company.main_phone} href={contact.company.main_phone ? `tel:${contact.company.main_phone}` : undefined} />
            </>
          ) : (
            <p className="text-xs text-dk-dim">회사 정보 없음</p>
          )}
        </section>
      </div>

      {/* 태그 */}
      <section className="bg-dk-surface border border-dk-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-3.5 h-3.5 text-dk-muted" />
          <h2 className="text-xs font-semibold text-dk-dim uppercase tracking-wider">태그</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(contact.tags ?? []).map(tag => (
            <span
              key={tag.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ backgroundColor: `${tag.color}20`, borderColor: `${tag.color}50`, color: tag.color }}
            >
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                disabled={tagLoading}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* 태그 추가 */}
          {unassignedTags.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTagPicker(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-dk-dim border border-dashed border-dk-border hover:border-dk-border2 hover:text-dk-muted transition-colors"
              >
                <Plus className="w-3 h-3" />태그 추가
              </button>
              {showTagPicker && (
                <div className="absolute left-0 top-8 z-20 w-48 bg-dk-surface border border-dk-border rounded-xl shadow-lg py-1">
                  {unassignedTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag.id)}
                      disabled={tagLoading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-dk-text hover:bg-dk-surface2 transition-colors text-left"
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(contact.tags ?? []).length === 0 && unassignedTags.length === 0 && (
            <p className="text-xs text-dk-dim">태그 없음 · 설정에서 태그를 먼저 만드세요</p>
          )}
        </div>
      </section>

      {/* 메모 */}
      {contact.notes && (
        <section className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-dk-dim uppercase tracking-wider mb-2">메모</h2>
          <p className="text-sm text-dk-text whitespace-pre-wrap">{contact.notes}</p>
        </section>
      )}

      {/* 활동 이력 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-dk-text">활동 이력</h2>
          <button
            onClick={() => setShowAddActivity(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dk-surface border border-dk-border rounded-lg text-dk-muted hover:text-dk-text hover:bg-dk-surface2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />활동 추가
          </button>
        </div>

        {showAddActivity && (
          <div className="mb-3 p-4 bg-dk-surface border border-dk-border rounded-xl space-y-3">
            <div className="flex gap-2 flex-wrap">
              {ACTIVITY_TYPES.map(t => (
                <button key={t} onClick={() => setActivityType(t)}
                  className={cn('px-2.5 py-1 text-xs rounded-lg transition-colors', activityType === t ? 'bg-dk-accent text-white' : 'bg-dk-surface2 text-dk-muted hover:text-dk-text')}>
                  {ACTIVITY_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <textarea
              value={activityContent}
              onChange={e => setActivityContent(e.target.value)}
              placeholder="활동 내용을 입력하세요..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-dk-surface2 border border-dk-border rounded-lg text-dk-text placeholder-dk-dim focus:outline-none focus:ring-2 focus:ring-dk-blue/50 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddActivity(false)} className="px-3 py-1.5 text-xs text-dk-muted border border-dk-border rounded-lg hover:bg-dk-surface2 transition-colors">취소</button>
              <button onClick={addActivity} disabled={submitting || !activityContent.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dk-accent text-white rounded-lg hover:bg-dk-accentHover disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}저장
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {activities.length === 0 && <p className="text-xs text-dk-dim py-4 text-center">활동 이력이 없습니다</p>}
          {activities.map(a => (
            <div key={a.id} className="flex gap-3 p-3 bg-dk-surface border border-dk-border rounded-xl">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-7 h-7 rounded-lg bg-dk-surface2 flex items-center justify-center">
                  <span className="text-[10px] text-dk-muted font-medium">{ACTIVITY_TYPE_LABEL[a.type][0]}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-dk-surface2 text-dk-muted px-1.5 py-0.5 rounded">{ACTIVITY_TYPE_LABEL[a.type]}</span>
                  <span className="text-[10px] text-dk-dim">{formatDateTime(a.created_at)}</span>
                </div>
                {a.content && <p className="text-sm text-dk-text whitespace-pre-wrap">{a.content}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 명함 이미지 */}
      {card && (card.front_image_url || card.back_image_url) && (
        <section className="bg-dk-surface border border-dk-border rounded-xl p-4">
          <h2 className="text-xs font-semibold text-dk-dim uppercase tracking-wider mb-3">명함 이미지</h2>
          <div className="flex gap-3 flex-wrap">
            {card.front_image_url && (
              <img src={card.front_image_url} alt="명함 앞면" className="h-32 rounded-lg border border-dk-border object-cover" />
            )}
            {card.back_image_url && (
              <img src={card.back_image_url} alt="명함 뒷면" className="h-32 rounded-lg border border-dk-border object-cover" />
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function InfoRow({ label, value, href }: { label: string; value: string | null | undefined; href?: string }) {
  if (!value) return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dk-dim w-16 shrink-0">{label}</span>
      <span className="text-xs text-dk-dim">—</span>
    </div>
  )
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dk-dim w-16 shrink-0">{label}</span>
      {href
        ? <a href={href} className="text-sm text-dk-blue hover:text-dk-blueHover truncate">{value}</a>
        : <span className="text-sm text-dk-text truncate">{value}</span>
      }
    </div>
  )
}
