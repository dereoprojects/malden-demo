// src/app/page.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Madlen Chat (scaffold)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Type a message…" />
          <div className="flex justify-end">
            <Button>Send</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
