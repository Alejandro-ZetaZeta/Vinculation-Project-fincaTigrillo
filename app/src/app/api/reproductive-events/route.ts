import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'
import { calcFechaParto } from '@/lib/formulas'

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return null
  return { client: createInsForgeServerClient(accessToken), token: accessToken }
}

// GET: Listar eventos reproductivos (opcionalmente filtrado por animal_id)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient()
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')

    // Use flat select to avoid nested join issues with the ORM
    let query = auth.client.database
      .from('reproductive_events')
      .select('*')
      .order('event_date', { ascending: false })

    if (animalId) {
      query = query.eq('animal_id', animalId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('GET reproductive_events DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with animal data + sire data
    const animalIds = [...new Set((events || []).map((e: { animal_id: string }) => e.animal_id))]
    const sireIds   = [...new Set((events || []).filter((e: { sire_id?: string }) => e.sire_id).map((e: { sire_id: string }) => e.sire_id))]

    const animalsMap: Record<string, { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | null }> = {}
    const siresMap: Record<string, string> = {}

    if (animalIds.length > 0) {
      const { data: animalsData } = await auth.client.database
        .from('animals')
        .select('id, name, identification_code, animal_types(name, slug)')
        .in('id', animalIds)

      if (animalsData) {
        for (const raw of animalsData as { id: string; name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | { name: string; slug: string }[] | null }[]) {
          const at = Array.isArray(raw.animal_types) ? raw.animal_types[0] ?? null : raw.animal_types
          animalsMap[raw.id] = { name: raw.name, identification_code: raw.identification_code, animal_types: at }
        }
      }
    }

    if (sireIds.length > 0) {
      const { data: siresData } = await auth.client.database
        .from('animals')
        .select('id, name, identification_code')
        .in('id', sireIds)
      if (siresData) {
        for (const s of siresData as { id: string; name: string | null; identification_code: string | null }[]) {
          siresMap[s.id] = s.name || s.identification_code || s.id
        }
      }
    }

    // Merge animal + sire info into events
    const enriched = (events || []).map((ev: { animal_id: string; sire_id?: string } & Record<string, unknown>) => ({
      ...ev,
      animals: animalsMap[ev.animal_id] || null,
      sire_name: ev.sire_id ? (siresMap[ev.sire_id] || null) : null,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('GET /api/reproductive-events error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST: Registrar nuevo evento reproductivo
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient()
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verificar admin
    const { data: userData } = await auth.client.auth.getCurrentUser()
    if (!userData?.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

    const { data: profile } = await auth.client.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    const body = await request.json()
    const { animal_id, event_type, event_date, notes, species_slug, sire_id, quantity } = body

    if (!animal_id || !event_type || !event_date) {
      return NextResponse.json({ error: 'Campos requeridos: animal_id, event_type, event_date' }, { status: 400 })
    }

    // Fetch target animal to enforce business rules server-side.
    const { data: animalRow, error: animalErr } = await auth.client.database
      .from('animals')
      .select('id, sex, status, metadata, is_litter, litter_count, litter_alive, animal_types(slug)')
      .eq('id', animal_id)
      .maybeSingle()

    if (animalErr) {
      return NextResponse.json({ error: animalErr.message || 'Error al validar animal' }, { status: 400 })
    }
    if (!animalRow) {
      return NextResponse.json({ error: 'Animal no encontrado' }, { status: 404 })
    }

    const animalTypes = (animalRow as unknown as { animal_types?: { slug?: string } | { slug?: string }[] | null }).animal_types
    const typeSlug = Array.isArray(animalTypes) ? (animalTypes[0]?.slug ?? undefined) : (animalTypes?.slug ?? undefined)
    const sexRaw = (animalRow as unknown as { sex?: unknown }).sex
    const sex = typeof sexRaw === 'string' ? sexRaw.toLowerCase() : null

    const isPoultryBatch = typeSlug === 'aves-de-corral'
    const isLitterRaw = (animalRow as unknown as { is_litter?: unknown }).is_litter
    const isPorcinoLitter = isLitterRaw === true && typeSlug === 'porcino'
    const isBatchAnimal = isPoultryBatch || isPorcinoLitter

    // Reproductive event types that require individual females
    const reproductiveOnlyTypes = new Set([
      'monta_natural',
      'inseminacion',
      'confirmacion_prenez',
      'parto',
      'aborto',
    ])

    if (event_type === 'muerte') {
      // Mortality events: allowed for poultry batches AND porcino litters
      if (!isBatchAnimal) {
        return NextResponse.json({ error: 'El evento de mortalidad solo aplica a lotes de aves de corral o camadas porcinas' }, { status: 400 })
      }
      const q = typeof quantity === 'number' ? quantity : parseInt(String(quantity ?? ''), 10)
      if (!Number.isFinite(q) || q <= 0) {
        return NextResponse.json({ error: 'Cantidad inválida para mortalidad' }, { status: 400 })
      }
    } else if (event_type === 'destete') {
      // Weaning: allowed for individual females AND litters
      if (isPorcinoLitter) {
        // For litters, quantity = piglets alive at weaning time (optional but useful)
        // No additional validation needed beyond date
      } else if (isPoultryBatch) {
        return NextResponse.json({ error: 'El destete no aplica a lotes avícolas' }, { status: 400 })
      } else if (sex !== 'hembra') {
        return NextResponse.json({ error: 'El destete solo aplica a hembras' }, { status: 400 })
      }
    } else if (reproductiveOnlyTypes.has(event_type)) {
      // Reproductive events require a female individual (not a batch)
      if (isBatchAnimal) {
        return NextResponse.json({
          error: isPoultryBatch
            ? 'Los eventos reproductivos no aplican a lotes avícolas'
            : 'Los eventos reproductivos no aplican a camadas porcinas'
        }, { status: 400 })
      }
      if (sex !== 'hembra') {
        return NextResponse.json({ error: 'Los eventos reproductivos solo aplican a hembras' }, { status: 400 })
      }
    }

    // Calcular fecha estimada de parto si es monta o inseminación
    let expected_due_date: string | null = null
    if ((event_type === 'monta_natural' || event_type === 'inseminacion') && species_slug) {
      const dueDate = calcFechaParto(new Date(event_date + 'T12:00:00'), species_slug)
      if (dueDate) {
        expected_due_date = dueDate.toISOString().split('T')[0]
      }
    }

    // For litter weaning, store quantity (alive piglets at weaning time)
    const eventQuantity = event_type === 'muerte'
      ? (typeof quantity === 'number' ? quantity : parseInt(String(quantity ?? ''), 10))
      : (event_type === 'destete' && isPorcinoLitter && quantity != null)
        ? (typeof quantity === 'number' ? quantity : parseInt(String(quantity ?? ''), 10))
        : null

    const insertPayload = {
      animal_id,
      event_type,
      event_date,
      expected_due_date,
      notes: notes || null,
      quantity: eventQuantity,
      sire_id: (event_type === 'monta_natural' && sire_id) ? sire_id : null,
      created_by: userData.user.id,
    }

    console.log('POST reproductive_events payload:', JSON.stringify(insertPayload))

    const { data, error } = await auth.client.database
      .from('reproductive_events')
      .insert([insertPayload])
      .select()

    if (error) {
      console.error('POST reproductive_events DB error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message || 'Error al guardar evento' }, { status: 400 })
    }

    // ── Post-insert: auto-update batch counts and status on mortality ──
    if (event_type === 'muerte' && isBatchAnimal) {
      if (isPoultryBatch) {
        // Poultry batch: use metadata.cantidad as initial count
        const meta = (animalRow as unknown as { metadata?: Record<string, unknown> | null }).metadata
        const initialRaw = meta?.cantidad
        const initial = typeof initialRaw === 'number' ? initialRaw : parseInt(String(initialRaw ?? ''), 10)

        if (Number.isFinite(initial) && initial >= 0) {
          const { data: deathsData } = await auth.client.database
            .from('reproductive_events')
            .select('quantity')
            .eq('animal_id', animal_id)
            .eq('event_type', 'muerte')

          const totalDeaths = Array.isArray(deathsData)
            ? deathsData.reduce((sum: number, row: unknown) => {
              const qRaw = (row as { quantity?: unknown } | null)?.quantity
              const q = typeof qRaw === 'number' ? qRaw : (parseInt(String(qRaw ?? ''), 10) || 0)
              return sum + q
            }, 0)
            : 0

          const remaining = initial - totalDeaths
          const statusRaw = (animalRow as unknown as { status?: unknown }).status
          if (remaining <= 0 && statusRaw !== 'muerto') {
            await auth.client.database
              .from('animals')
              .update({ status: 'muerto' })
              .eq('id', animal_id)
          }
        }
      } else if (isPorcinoLitter) {
        // Porcino litter: use litter_count as initial count, update litter_alive
        const litterCountRaw = (animalRow as unknown as { litter_count?: unknown }).litter_count
        const litterCount = typeof litterCountRaw === 'number' ? litterCountRaw : parseInt(String(litterCountRaw ?? ''), 10)

        if (Number.isFinite(litterCount) && litterCount >= 0) {
          const { data: deathsData } = await auth.client.database
            .from('reproductive_events')
            .select('quantity')
            .eq('animal_id', animal_id)
            .eq('event_type', 'muerte')

          const totalDeaths = Array.isArray(deathsData)
            ? deathsData.reduce((sum: number, row: unknown) => {
              const qRaw = (row as { quantity?: unknown } | null)?.quantity
              const q = typeof qRaw === 'number' ? qRaw : (parseInt(String(qRaw ?? ''), 10) || 0)
              return sum + q
            }, 0)
            : 0

          const remaining = Math.max(0, litterCount - totalDeaths)
          const updatePayload: Record<string, unknown> = { litter_alive: remaining }
          const statusRaw = (animalRow as unknown as { status?: unknown }).status
          if (remaining <= 0 && statusRaw !== 'muerto') {
            updatePayload.status = 'muerto'
          }
          await auth.client.database
            .from('animals')
            .update(updatePayload)
            .eq('id', animal_id)
        }
      }
    }

    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/reproductive-events error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
