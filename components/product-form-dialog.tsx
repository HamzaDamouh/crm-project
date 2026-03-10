"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet"
import { createProduct, updateProduct } from "@/app/actions/products"

interface Category {
  id: number
  name: string
}

interface ProductFormDialogProps {
  categories: Category[]
  product?: {
    id: number
    name: string
    reference: string | null
    category_id: number | null
    unit: string | null
    stock_min: number
    tax_rate: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ProductFormDialog({ categories, product, open, onOpenChange, onSuccess }: ProductFormDialogProps) {
  const isEditing = !!product
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: product?.name || "",
    reference: product?.reference || "",
    category_id: product?.category_id?.toString() || "",
    unit: product?.unit || "u",
    stock_min: product?.stock_min?.toString() || "0",
    tax_rate: (product?.tax_rate !== undefined) ? product.tax_rate.toString() : "20",
    initial_stock: "0"
  })

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: product?.name || "",
        reference: product?.reference || "",
        category_id: product?.category_id?.toString() || "",
        unit: product?.unit || "u",
        stock_min: product?.stock_min?.toString() || "0",
        tax_rate: (product?.tax_rate !== undefined) ? product.tax_rate.toString() : "20",
        initial_stock: "0"
      })
    }
  }, [open, product])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name,
        reference: formData.reference,
        category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
        unit: formData.unit,
        stock_min: parseFloat(formData.stock_min) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
      }

      let result
      if (isEditing && product) {
        result = await updateProduct(product.id, payload)
      } else {
        result = await createProduct({
          ...payload,
          initial_stock: parseFloat(formData.initial_stock) || 0
        })
      }

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Erreur inattendue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Modifier le produit" : "Nouveau produit"}</SheetTitle>
          <SheetDescription>
             {isEditing ? "Modifiez les informations du produit ci-dessous." : "Remplissez les informations pour ajouter un nouveau produit."}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du produit *</Label>
            <Input 
              id="name" name="name" required 
              value={formData.name} onChange={handleChange} 
               placeholder="Ex: Ciment CPJ 45"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Référence / SKU</Label>
            <Input 
              id="reference" name="reference" 
              value={formData.reference} onChange={handleChange} 
               placeholder="Ex: CIM-45-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Catégorie</Label>
            <select
              id="category_id" name="category_id"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.category_id} onChange={handleChange}
            >
              <option value="">-- Aucune catégorie --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="unit">Unité</Label>
              <Input 
                id="unit" name="unit" 
                value={formData.unit} onChange={handleChange} 
                 placeholder="Ex: kg, Unité, Sac"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_rate">TVA (%)</Label>
              <Input 
                type="number" step="0.1"
                id="tax_rate" name="tax_rate" required
                value={formData.tax_rate} onChange={handleChange} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="stock_min">Stock d&apos;alerte</Label>
              <Input 
                type="number" step="0.01"
                id="stock_min" name="stock_min" required
                value={formData.stock_min} onChange={handleChange} 
              />
            </div>
            
            {!isEditing && (
               <div className="space-y-2">
                <Label htmlFor="initial_stock">Stock Initial</Label>
                <Input 
                  type="number" step="0.01"
                  id="initial_stock" name="initial_stock" 
                  value={formData.initial_stock} onChange={handleChange} 
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enregistrement..." : (isEditing ? "Enregistrer" : "Créer")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
