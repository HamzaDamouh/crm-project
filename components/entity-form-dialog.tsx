"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet"
import { createEntity, updateEntity } from "@/app/actions/entities"

interface Entity {
  id: number
  name: string
  type: string
  phone: string | null
  email: string | null
  address: string | null
  ice: string | null
}

interface EntityFormDialogProps {
  entity?: Entity
  defaultType?: "client" | "entreprise" | "fournisseur"
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EntityFormDialog({ entity, defaultType = "client", open, onOpenChange, onSuccess }: EntityFormDialogProps) {
  const isEditing = !!entity
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [formData, setFormData] = React.useState({
    name: entity?.name || "",
    type: entity?.type === "supplier" ? "fournisseur" : (entity?.type || defaultType),
    phone: entity?.phone || "",
    email: entity?.email || "",
    address: entity?.address || "",
    ice: entity?.ice || ""
  })

  React.useEffect(() => {
    if (open) {
      setFormData({
        name: entity?.name || "",
        type: entity?.type === "supplier" ? "fournisseur" : (entity?.type || defaultType),
        phone: entity?.phone || "",
        email: entity?.email || "",
        address: entity?.address || "",
        ice: entity?.ice || ""
      })
    }
  }, [open, entity, defaultType])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name,
        type: formData.type,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        ice: formData.ice,
      }

      let result
      if (isEditing && entity) {
        result = await updateEntity(entity.id, payload)
      } else {
        result = await createEntity(payload)
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
          <SheetTitle>{isEditing ? "Modifier les informations" : "Nouveau profil"}</SheetTitle>
          <SheetDescription>
             {isEditing ? "Modifiez les informations de ce profil ci-dessous." : "Remplissez les informations pour ajouter un nouveau profil dans la base de données."}
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="type">Type de profil</Label>
            <select
              id="type" name="type"
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 capitalize"
              value={formData.type} onChange={handleChange}
              disabled={isEditing} 
            >
              <option value="client">Client (Particulier)</option>
              <option value="entreprise">Client (Entreprise)</option>
              <option value="fournisseur">Fournisseur</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom / Raison sociale *</Label>
            <Input 
              id="name" name="name" required 
              value={formData.name} onChange={handleChange} 
               placeholder="Ex: Entreprise S.A.R.L"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input 
                id="phone" name="phone" type="tel"
                value={formData.phone} onChange={handleChange} 
                 placeholder="06 XX XX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                type="email"
                id="email" name="email" 
                value={formData.email} onChange={handleChange}
                placeholder="contact@exemple.com" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ice">I.C.E (Identifiant Commun de l&apos;Entreprise)</Label>
            <Input 
              id="ice" name="ice" 
              value={formData.ice} onChange={handleChange} 
               placeholder="15 chiffres"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Adresse locale</Label>
            <textarea
              id="address" name="address"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.address} onChange={handleChange}
              placeholder="Adresse complète"
            />
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
