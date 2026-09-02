import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useAuth } from '../auth/AuthProvider'
import { db } from '../db/database'
import { supabase } from '../lib/supabase'

type EntityType = 'transaction' | 'savings_goal' | 'pension_fund' | 'budget_limit' | 'settings'
type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'
const SYNC_MARKER_PREFIX = 'skryga-cloud-synced:'

interface CloudRecord {
  id: string
  family_id: string
  entity_type: EntityType
  payload: Record<string, unknown>
  updated_at: string
  updated_by: string
}

interface SyncContextValue {
  familyId: string | null
  role: 'owner' | 'member' | null
  status: SyncStatus
  lastSyncedAt: Date | null
  memberCount: number
  errorMessage: string | null
}

const SyncContext = createContext<SyncContextValue>({
  familyId: null, role: null, status: 'idle', lastSyncedAt: null, memberCount: 0, errorMessage: null,
})

function withoutLocalId<T extends { id?: number }>(record: T): Record<string, unknown> {
  const { id: _localId, ...payload } = record
  return payload as Record<string, unknown>
}

function revivePayload(entityType: EntityType, payload: Record<string, unknown>): Record<string, unknown> {
  const revived = { ...payload }
  if (entityType === 'transaction') {
    revived.date = new Date(String(payload.date))
    revived.createdAt = new Date(String(payload.createdAt))
  } else if (entityType === 'savings_goal') {
    revived.createdAt = new Date(String(payload.createdAt))
    if (payload.deadline) revived.deadline = new Date(String(payload.deadline))
  } else if (entityType === 'pension_fund') {
    revived.lastUpdated = new Date(String(payload.lastUpdated))
  }
  return revived
}

async function applyCloudRecord(record: CloudRecord): Promise<void> {
  const payload = revivePayload(record.entity_type, { ...record.payload, cloudId: record.id })
  const table = record.entity_type === 'transaction' ? db.transactions
    : record.entity_type === 'savings_goal' ? db.savingsGoals
      : record.entity_type === 'pension_fund' ? db.pensionFunds
        : record.entity_type === 'budget_limit' ? db.budgetLimits : db.settings
  const existing = await table.where('cloudId').equals(record.id).first()
  if (existing?.id) await table.update(existing.id, payload)
  else await table.add(payload as never)
}

async function removeCloudRecord(entityType: EntityType, cloudId: string): Promise<void> {
  const table = entityType === 'transaction' ? db.transactions
    : entityType === 'savings_goal' ? db.savingsGoals
      : entityType === 'pension_fund' ? db.pensionFunds
        : entityType === 'budget_limit' ? db.budgetLimits : db.settings
  const existing = await table.where('cloudId').equals(cloudId).first()
  if (existing?.id) await table.delete(existing.id)
}

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const transactions = useLiveQuery(() => db.transactions.toArray(), [])
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray(), [])
  const pensionFunds = useLiveQuery(() => db.pensionFunds.toArray(), [])
  const budgetLimits = useLiveQuery(() => db.budgetLimits.toArray(), [])
  const settings = useLiveQuery(() => db.settings.toArray(), [])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [role, setRole] = useState<'owner' | 'member' | null>(null)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [syncReady, setSyncReady] = useState(false)
  const initialized = useRef(false)
  const applyingRemote = useRef(false)
  const knownRemoteIds = useRef(new Set<string>())

  const snapshotsReady = [transactions, savingsGoals, pensionFunds, budgetLimits, settings].every(Boolean)

  useEffect(() => {
    if (!supabase || !user || !snapshotsReady || initialized.current) return
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function initialize() {
      setStatus('syncing')
      setErrorMessage(null)
      const { data: memberships, error: membershipError } = await supabase!
        .from('family_members').select('family_id, role').eq('user_id', user!.id)
      if (membershipError) throw membershipError
      const activeFamilyId = localStorage.getItem(`skryga-active-family:${user!.id}`)
      // A new account initially owns a private family. After it accepts an invite,
      // prefer the shared membership even if the browser lost its local marker.
      const sharedMembership = memberships?.find(item => item.role === 'member')
      const membership = sharedMembership
        ?? memberships?.find(item => item.family_id === activeFamilyId)
        ?? memberships?.[0]
      if (!membership) throw new Error('No family membership found')
      localStorage.setItem(`skryga-active-family:${user!.id}`, membership.family_id)
      if (cancelled) return
      setFamilyId(membership.family_id)
      setRole(membership.role)

      const { count, error: countError } = await supabase!
        .from('family_members').select('*', { count: 'exact', head: true }).eq('family_id', membership.family_id)
      if (countError) throw countError
      setMemberCount(count ?? 0)

      const { data: remoteRecords, error: recordsError } = await supabase!
        .from('cloud_records').select('*').eq('family_id', membership.family_id)
      if (recordsError) throw recordsError

      applyingRemote.current = true
      try {
        const syncMarker = `${SYNC_MARKER_PREFIX}${user!.id}:${membership.family_id}`
        if ((remoteRecords?.length ?? 0) > 0 && !localStorage.getItem(syncMarker)) {
          await db.transaction('rw', [db.transactions, db.savingsGoals, db.pensionFunds, db.budgetLimits, db.settings], async () => {
            await Promise.all([
              db.transactions.clear(), db.savingsGoals.clear(), db.pensionFunds.clear(),
              db.budgetLimits.clear(), db.settings.clear(),
            ])
          })
        }
        for (const record of (remoteRecords ?? []) as CloudRecord[]) await applyCloudRecord(record)
        knownRemoteIds.current = new Set((remoteRecords ?? []).map(record => record.id))
        localStorage.setItem(syncMarker, new Date().toISOString())
      } finally {
        applyingRemote.current = false
      }

      channel = supabase!.channel(`family:${membership.family_id}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'cloud_records', filter: `family_id=eq.${membership.family_id}`,
        }, async (change: RealtimePostgresChangesPayload<CloudRecord>) => {
          applyingRemote.current = true
          try {
            if (change.eventType === 'DELETE') {
              const oldRecord = change.old as Partial<CloudRecord>
              if (oldRecord.id && oldRecord.entity_type) {
                knownRemoteIds.current.delete(oldRecord.id)
                await removeCloudRecord(oldRecord.entity_type, oldRecord.id)
              }
            } else {
              const newRecord = change.new as CloudRecord
              knownRemoteIds.current.add(newRecord.id)
              await applyCloudRecord(newRecord)
            }
          } finally {
            applyingRemote.current = false
          }
        }).subscribe()

      initialized.current = true
      setSyncReady(true)
      setStatus('synced')
      setLastSyncedAt(new Date())
    }

    initialize().catch(error => {
      console.error('Cloud sync initialization failed:', error)
      setStatus('error')
      setErrorMessage('Не удалось подключиться к общему семейному счёту.')
    })
    return () => {
      cancelled = true
      if (channel) void supabase!.removeChannel(channel)
      initialized.current = false
      setSyncReady(false)
      knownRemoteIds.current.clear()
    }
  }, [snapshotsReady, user])

  useEffect(() => {
    if (!supabase || !user || !familyId || !syncReady || !initialized.current || applyingRemote.current || !snapshotsReady) return
    const timer = window.setTimeout(async () => {
      setStatus('syncing')
      setErrorMessage(null)
      try {
        // Read IndexedDB directly after the debounce. React snapshots can still
        // contain the state from before an incoming Realtime update.
        const [currentTransactions, currentSavingsGoals, currentPensionFunds, currentBudgetLimits, currentSettings] = await Promise.all([
          db.transactions.toArray(), db.savingsGoals.toArray(), db.pensionFunds.toArray(),
          db.budgetLimits.toArray(), db.settings.toArray(),
        ])
        const localRecords = [
          ...currentTransactions.map(item => ({ entity_type: 'transaction' as const, item })),
          ...currentSavingsGoals.map(item => ({ entity_type: 'savings_goal' as const, item })),
          ...currentPensionFunds.map(item => ({ entity_type: 'pension_fund' as const, item })),
          ...currentBudgetLimits.map(item => ({ entity_type: 'budget_limit' as const, item })),
          ...currentSettings.map(item => ({ entity_type: 'settings' as const, item })),
        ].filter(entry => entry.item.cloudId)

        if (localRecords.length) {
          const { error } = await supabase!.from('cloud_records').upsert(localRecords.map(entry => ({
            id: entry.item.cloudId!,
            family_id: familyId,
            entity_type: entry.entity_type,
            payload: withoutLocalId(entry.item),
            updated_by: user!.id,
            updated_at: new Date().toISOString(),
          })))
          if (error) throw error
        }

        const localIds = new Set(localRecords.map(entry => entry.item.cloudId!))
        const { data: remoteIds, error: remoteError } = await supabase!.from('cloud_records').select('id').eq('family_id', familyId)
        if (remoteError) throw remoteError
        // Delete only records previously observed by this device. A record newly
        // created by the other account must never be deleted because a stale
        // React snapshot did not contain it yet.
        const removedIds = (remoteIds ?? []).map(record => record.id)
          .filter(id => knownRemoteIds.current.has(id) && !localIds.has(id))
        if (removedIds.length) {
          const { error } = await supabase!.from('cloud_records').delete().eq('family_id', familyId).in('id', removedIds)
          if (error) throw error
        }
        knownRemoteIds.current = new Set(
          [...(remoteIds ?? []).map(record => record.id), ...localIds].filter(id => !removedIds.includes(id))
        )
        setStatus('synced')
        setLastSyncedAt(new Date())
      } catch (error) {
        console.error('Cloud sync failed:', error)
        setStatus('error')
        setErrorMessage('Изменения сохранены на устройстве, но ещё не отправлены в облако.')
      }
    }, 800)
    return () => window.clearTimeout(timer)
  }, [budgetLimits, familyId, pensionFunds, savingsGoals, settings, snapshotsReady, syncReady, transactions, user])

  const context = useMemo(() => ({ familyId, role, status, lastSyncedAt, memberCount, errorMessage }),
    [errorMessage, familyId, lastSyncedAt, memberCount, role, status])
  return <SyncContext.Provider value={context}>{children}</SyncContext.Provider>
}

export function useCloudSync(): SyncContextValue {
  return useContext(SyncContext)
}
