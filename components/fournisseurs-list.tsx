"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Search, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { EntityFormDialog } from "@/components/entity-form-dialog"

interface Supplier {
  id: number
  name: string
  type: string
  totalPurchased: number
  balance_due: number
  lastActivity: string
}

export function FournisseursListClient({
  suppliers,
  totalCount,
  pageSize,
  currentPage,
}: {
  suppliers: Supplier[]
  totalCount: number
  pageSize: number
  currentPage: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [createOpen, setCreateOpen] = React.useState(false)

  const queryFilter = searchParams.get("query") || ""

  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "") {
          newSearchParams.delete(key)
        } else {
          newSearchParams.set(key, String(value))
        }
      }

      return newSearchParams.toString()
    },
    [searchParams]
  )

  const updateFilters = (newParams: Record<string, string | number | null>) => {
    const params = { ...newParams }
    if (!params.page && currentPage !== 1) {
      params.page = 1
    }
    const queryString = createQueryString(params)
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Fournisseurs</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau fournisseur
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un fournisseur..."
          className="pl-9"
          defaultValue={queryFilter}
          onChange={(e) => {
            const val = e.target.value
            const timeout = setTimeout(() => {
              updateFilters({ query: val, page: 1 })
            }, 500)
            return () => clearTimeout(timeout)
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total acheté</TableHead>
                <TableHead className="text-right">Solde à payer</TableHead>
                <TableHead>Dernière activité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/fournisseurs/${supplier.id}`)}
                >
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {supplier.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(supplier.totalPurchased)}
                  </TableCell>
                  <TableCell className="text-right">
                    {supplier.balance_due > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {formatCurrency(supplier.balance_due)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0 MAD</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(supplier.lastActivity).toLocaleDateString("fr-MA")}
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Aucun fournisseur trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Affichage de {suppliers.length} sur {totalCount} fournisseurs
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ page: currentPage - 1 })}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage} sur {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ page: currentPage + 1 })}
            disabled={currentPage >= totalPages}
          >
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      
      <EntityFormDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
        defaultType="fournisseur"
      />
    </div>
  )
}
