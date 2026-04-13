import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import { notFound, redirect } from 'next/navigation'
import { AnimalForm } from '@/components/animals/AnimalForm'

export default async function RegisterAnimalPage({ params }: { params: Promise<{ typeSlug: string }> }) {
  const { typeSlug } = await params
  const user = await getCurrentUser()

  // Only admins can register animals
  if (user?.role !== 'admin') redirect('/dashboard')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: type } = await insforge.database
    .from('animal_types')
    .select('*, animal_categories(*)')
    .eq('slug', typeSlug)
    .maybeSingle()

  if (!type) notFound()

  const category = type.animal_categories as { slug: string; name: string }

  return (
    <AnimalForm
      typeSlug={type.slug}
      typeName={type.name}
      typeId={type.id}
      categorySlug={category.slug}
      categoryName={category.name}
    />
  )
}
