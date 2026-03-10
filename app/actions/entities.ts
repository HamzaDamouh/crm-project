"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createEntity(data: {
  name: string
  type: string
  phone?: string
  email?: string
  address?: string
  ice?: string
}) {
  try {
    const entityType = data.type === 'fournisseur' ? 'supplier' : data.type
    
    await prisma.entity.create({
      data: {
        name: data.name,
        type: entityType,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        ice: data.ice || null,
      },
    })
    
    revalidatePath("/clients")
    revalidatePath("/fournisseurs")
    revalidatePath("/transactions/new")
    revalidatePath("/achats/new")
    return { success: true, message: "Entité créée avec succès." }
  } catch (error) {
    console.error("Error creating entity:", error)
    return { success: false, error: "Erreur lors de la création." }
  }
}

export async function updateEntity(id: number, data: {
  name: string
  type: string
  phone?: string
  email?: string
  address?: string
  ice?: string
}) {
  try {
    const entityType = data.type === 'fournisseur' ? 'supplier' : data.type

    await prisma.entity.update({
      where: { id },
      data: {
        name: data.name,
        type: entityType,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        ice: data.ice || null,
      },
    })

    revalidatePath(`/clients/${id}`)
    revalidatePath(`/fournisseurs/${id}`)
    revalidatePath("/clients")
    revalidatePath("/fournisseurs")
    revalidatePath("/transactions/new")
    revalidatePath("/achats/new")
    return { success: true, message: "Entité mise à jour avec succès." }
  } catch (error) {
    console.error("Error updating entity:", error)
    return { success: false, error: "Erreur lors de la mise à jour." }
  }
}

export async function deleteEntity(id: number) {
  try {
    await prisma.entity.update({
      where: { id },
      data: { is_active: false },
    })

    revalidatePath("/clients")
    revalidatePath("/fournisseurs")
    revalidatePath("/transactions/new")
    revalidatePath("/achats/new")
    return { success: true, message: "Entité supprimée avec succès." }
  } catch (error) {
    console.error("Error deleting entity:", error)
    return { success: false, error: "Erreur lors de la suppression." }
  }
}
