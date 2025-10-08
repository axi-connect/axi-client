import { NextRequest, NextResponse } from "next/server"

type Intention = {
  id: number
  code: string
  flow_name: string
  description: string
  ai_instructions: string
  priority: "low" | "medium" | "high"
  type: string
}

function pseudoRandom(seed: number) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateIntentions(params: { type: string; flow: string; limit: number; offset: number }): Intention[] {
  const { type, flow, limit, offset } = params
  const items: Intention[] = []
  for (let i = 0; i < limit; i++) {
    const id = offset + i + 1
    const rnd = pseudoRandom(id + type.length + flow.length)
    const priority = rnd < 0.33 ? "low" : rnd < 0.66 ? "medium" : "high"
    items.push({
      id,
      code: `${flow.toUpperCase()}_${id}`,
      flow_name: flow,
      description: `Intención de ${flow} #${id} para ${type}`,
      ai_instructions: "",
      priority,
      type,
    })
  }
  return items
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "type"
  const flow = searchParams.get("flow") || "flow"
  const limit = Number(searchParams.get("limit") || 30)
  const offset = Number(searchParams.get("offset") || 0)
  const intentions = generateIntentions({ type, flow, limit, offset })
  return NextResponse.json({ data: { intentions } })
}