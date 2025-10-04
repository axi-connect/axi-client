import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KpiCard({ label, value, icon, href }: { label: string; value: number, icon: React.ReactNode, href: string }) {
  
  const handleCreate = (label: string) => {
    window.dispatchEvent(new CustomEvent(`${label}:create:open`))
  }
  
  return (
    <div className="flex flex-col gap-2 w-full border border-border-soft bg-background/40 rounded-xl p-4">
      <div className="flex items-center">
        <div className="p-2 rounded-lg bg-brand-gradient text-white">
          {icon}
        </div>

        <div className="ml-4">
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
      <hr className="h-full border-border-soft" />
      <div className="flex">
        <Button 
          size="sm"
          variant="default" 
          disabled={label === "Usuarios"}
          style={{ borderRadius: "9999px" }} 
          onClick={() => handleCreate(label)}
        >
          <Plus className="h-4 w-4" />
          {`Crear ${label.slice(0, -1)}`}
        </Button>

        <Link className="ml-auto" href={href}>
          <Button variant="ghost" className="w-full" size="sm">
            Ver más
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}