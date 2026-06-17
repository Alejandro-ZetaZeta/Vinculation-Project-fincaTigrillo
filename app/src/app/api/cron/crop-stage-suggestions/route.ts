import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeAdminClient } from '@/lib/insforge/server'
import { shouldSuggestStage } from '@/lib/sembrios/stages'
import type { StageDefinition } from '@/lib/sembrios/types'

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/crop-stage-suggestions] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.INSFORGE_API_KEY) {
    console.error('[cron/crop-stage-suggestions] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const db = createInsForgeAdminClient().database

  try {
    const { data: sembrios, error: sembriosError } = await db
      .from('sembrios')
      .select('id, current_stage, stage_updated_at, tipo_cultivo')
      .eq('estado', 'en_crecimiento')
      .not('current_stage', 'is', null)

    if (sembriosError) throw new Error(sembriosError.message)

    if (!sembrios || sembrios.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, suggestions_created: 0 })
    }

    const sembrioIds = sembrios.map((s: { id: string }) => s.id)
    const { data: configs, error: configsError } = await db
      .from('sembrio_stage_config')
      .select('sembrio_id, stages')
      .in('sembrio_id', sembrioIds)

    if (configsError) throw new Error(configsError.message)

    const configMap = new Map<string, StageDefinition[]>()
    for (const config of (configs || [])) {
      configMap.set(config.sembrio_id, config.stages as StageDefinition[])
    }

    const { data: pendingSuggestions, error: pendingError } = await db
      .from('stage_suggestions')
      .select('sembrio_id, current_stage, suggested_stage')
      .eq('status', 'pending')

    if (pendingError) throw new Error(pendingError.message)

    const pendingSet = new Set(
      (pendingSuggestions || []).map(
        (s: { sembrio_id: string; current_stage: string; suggested_stage: string }) =>
          `${s.sembrio_id}:${s.current_stage}:${s.suggested_stage}`
      )
    )

    let suggestionsCreated = 0

    for (const sembrio of sembrios) {
      const stages = configMap.get(sembrio.id)
      if (!stages || stages.length === 0) continue

      const result = shouldSuggestStage(
        sembrio.current_stage,
        sembrio.stage_updated_at,
        stages
      )

      if (!result.shouldSuggest || !result.suggestedStage) continue

      const key = `${sembrio.id}:${sembrio.current_stage}:${result.suggestedStage}`
      if (pendingSet.has(key)) continue

      const { error: insertError } = await db
        .from('stage_suggestions')
        .insert([{
          sembrio_id: sembrio.id,
          current_stage: sembrio.current_stage,
          suggested_stage: result.suggestedStage,
          days_in_current: result.daysInCurrent,
          theoretical_days: result.theoreticalDays,
          message: result.message,
          status: 'pending',
        }])

      if (insertError) {
        console.error(`[cron/crop-stage-suggestions] Insert failed for ${sembrio.id}:`, insertError.message)
        continue
      }

      const stageLabel = stages.find(s => s.key === result.suggestedStage)?.label || result.suggestedStage
      const currentLabel = stages.find(s => s.key === sembrio.current_stage)?.label || sembrio.current_stage

      const { error: notifError } = await db
        .from('notifications')
        .insert([{
          title: `Sugerencia de Etapa: ${sembrio.tipo_cultivo}`,
          message: `El cultivo debería pasar de '${currentLabel}' a '${stageLabel}'. Revise en el módulo de Sembríos.`,
          type: 'warning',
          is_read: false,
        }])

      if (notifError) {
        console.error(`[cron/crop-stage-suggestions] Notification failed for ${sembrio.id}:`, notifError.message)
      }

      suggestionsCreated++
    }

    console.log(`[cron/crop-stage-suggestions] Processed ${sembrios.length}, created ${suggestionsCreated} suggestions`)
    return NextResponse.json({ ok: true, processed: sembrios.length, suggestions_created: suggestionsCreated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/crop-stage-suggestions]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
