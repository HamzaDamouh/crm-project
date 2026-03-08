import prisma from "@/lib/db"
import { Entity } from "@prisma/client"

export default async function Home() {
  const entities = await prisma.entity.findMany()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8">B2B CRM Scaffold</h1>
      <div className="space-y-4">
        <p className="text-lg">Database connected with new schema!</p>
        <div className="bg-muted p-4 rounded-lg">
          <ul className="list-disc pl-5">
            {entities.map((entity: Entity) => (
              <li key={entity.id}>{entity.name} ({entity.type}) - {entity.created_at.toISOString()}</li>
            ))}
            {entities.length === 0 && <li>No entities found. Add some later!</li>}
          </ul>
        </div>
      </div>
    </main>
  )
}
