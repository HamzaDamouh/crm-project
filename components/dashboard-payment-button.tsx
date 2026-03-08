"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { PaymentModal } from "@/components/payment-modal"

interface Entity {
  id: number
  name: string
  balance_due?: number
}

interface DashboardPaymentButtonProps {
  invoiceId: number
  balanceDue: number
  entities: Entity[]
}

export function DashboardPaymentButton({
  invoiceId,
  balanceDue,
  entities,
}: DashboardPaymentButtonProps) {
  const [showModal, setShowModal] = React.useState(false)

  // Find a sensible default entity ID (the one with the largest balance due or just the first one)
  const defaultEntityId = entities[0]?.id || 0

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className="text-xs h-8 px-2"
      >
        Enregistrer paiement
      </Button>

      {showModal && (
        <PaymentModal
          invoiceId={invoiceId}
          balanceDue={balanceDue}
          defaultEntityId={defaultEntityId}
          entities={entities}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
