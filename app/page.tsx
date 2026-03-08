import prisma from "@/lib/db"

interface TestModel {
  id: number;
  message: string;
  createdAt: Date;
}

export default async function Home() {
  await prisma.test.create({ data: { message: "Hello World from Prisma!" } })
  const tests = await prisma.test.findMany()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8">B2B CRM Scaffold</h1>
      <div className="space-y-4">
        <p className="text-lg">Database connected successfully!</p>
        <div className="bg-muted p-4 rounded-lg">
          <ul className="list-disc pl-5">
            {tests.map((test: TestModel) => (
              <li key={test.id}>{test.message} - {test.createdAt.toISOString()}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
