"use server"

import prisma from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createProduct(data: {
  name: string
  reference?: string
  category_id?: number
  unit?: string
  stock_min: number
  tax_rate: number
  initial_stock?: number
}) {
  try {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        reference: data.reference || null,
        category_id: data.category_id || null,
        unit: data.unit || "u",
        stock_min: data.stock_min,
        tax_rate: data.tax_rate,
        stock_qty: data.initial_stock || 0,
      },
    })
    
    // Log initial stock if provided
    if (data.initial_stock && data.initial_stock > 0) {
      await prisma.stockMovement.create({
        data: {
          product_id: product.id,
          movement_type: 'in',
          qty: data.initial_stock,
          note: "Stock initial",
        }
      })
    }

    revalidatePath("/stock")
    revalidatePath("/transactions/new")
    revalidatePath("/achats/new")
    return { success: true, message: "Produit créé avec succès." }
  } catch (error) {
    console.error("Error creating product:", error)
    return { success: false, error: "Erreur lors de la création du produit." }
  }
}

export async function updateProduct(id: number, data: {
  name: string
  reference?: string
  category_id?: number
  unit?: string
  stock_min: number
  tax_rate: number
}) {
  try {
    await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        reference: data.reference || null,
        category_id: data.category_id || null,
        unit: data.unit || "u",
        stock_min: data.stock_min,
        tax_rate: data.tax_rate,
      },
    })

    revalidatePath("/stock")
    revalidatePath("/transactions/new")
    revalidatePath("/achats/new")
    return { success: true, message: "Produit mis à jour avec succès." }
  } catch (error) {
    console.error("Error updating product:", error)
    return { success: false, error: "Erreur lors de la mise à jour du produit." }
  }
}

export async function deleteProduct(id: number) {
  try {
    await prisma.product.update({
      where: { id },
      data: { is_active: false },
    })

    revalidatePath("/stock")
    revalidatePath("/transactions/new")
    revalidatePath("/achats/new")
    return { success: true, message: "Produit supprimé avec succès." }
  } catch (error) {
    console.error("Error deleting product:", error)
    return { success: false, error: "Erreur lors de la suppression du produit." }
  }
}

export async function adjustStock(id: number, newQty: number, note?: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id }
    })
    
    if (!product) {
      return { success: false, error: "Produit introuvable." }
    }
    
    const diff = newQty - product.stock_qty;
    
    if (diff === 0) {
       return { success: true, message: "Le stock est déjà à cette quantité." }
    }
    
    await prisma.$transaction([
      prisma.product.update({
        where: { id },
        data: { stock_qty: newQty }
      }),
      prisma.stockMovement.create({
        data: {
          product_id: id,
          movement_type: diff > 0 ? 'in' : 'out',
          qty: Math.abs(diff),
          note: note || "Ajustement manuel du stock",
        }
      })
    ])

    revalidatePath("/stock")
    return { success: true, message: "Stock ajusté avec succès." }
  } catch (error) {
    console.error("Error adjusting stock:", error)
    return { success: false, error: "Erreur lors de l'ajustement du stock." }
  }
}
