export type AdminFleetOption = { id: string; name: string; created_at: string }

/** Depois de criar a frota, o id fica seleccionado e o nome entra na lista. */
export function rememberCreatedFleet(
  created: AdminFleetOption,
  partners: AdminFleetOption[],
): { partnerId: string; partners: AdminFleetOption[] } {
  const id = created.id.trim()
  if (!id) return { partnerId: '', partners }
  const known = partners.some((partner) => partner.id === id)
  return {
    partnerId: id,
    partners: known ? partners : [{ id, name: created.name, created_at: created.created_at }, ...partners],
  }
}

export function fleetCreatedMessage(name: string): string {
  return `Frota “${name}” criada. Já podes criar o gestor.`
}
