### TreeView (Axi Connect)

Componente de árbol genérico, accesible y performante para Next.js + React + TypeScript + Tailwind + shadcn/ui. Soporta carga perezosa (lazy), virtualización opcional, búsqueda, selección, accesos rápidos y CRUD desacoplado mediante callbacks.

#### Instalación
No requiere dependencias externas para virtualización. Usa `framer-motion` (ya presente en el proyecto) para animaciones.

#### Tipos principales

#### TreeNode<T>
id: identificador único y estable del nodo (string).
label: texto principal que se muestra en la fila.
children: lista de nodos hijos (si existen).
isLeaf: indica si es una hoja (no tiene hijos cargables).
disabled: deshabilita interacción (selección/expandir).
meta: payload del dominio (tipo genérico T) para llevar datos adicionales.

```ts
export type TreeNode<T = unknown> = {
  id: string
  label: string
  children?: TreeNode<T>[]
  isLeaf?: boolean
  disabled?: boolean
  meta?: T
}

export type TreeViewProps<T = unknown> = {
  data: T[]
  mapToNode: (item: T) => TreeNode<T>
  initialExpanded?: string[]
  controlledExpanded?: string[]
  onExpandedChange?: (ids: string[]) => void
  selectedId?: string
  onSelect?: (node: TreeNode<T> | undefined) => void
  title?: React.ReactNode
  header?: React.ReactNode | ((ctx: { expandAll: () => void; collapseAll: () => void; viewSettings: () => void }) => React.ReactNode)
  renderLabel?: (node: TreeNode<T>) => React.ReactNode
  renderActions?: (node: TreeNode<T>) => React.ReactNode
  renderDescription?: (node: TreeNode<T>) => React.ReactNode
  getIcon?: (node: TreeNode<T>) => React.ReactNode
  getPriority?: (node: TreeNode<T>) => 'low' | 'medium' | 'high' | undefined
  showCounts?: boolean
  compact?: boolean
  search?: string
  onCreate?: (parentNode?: TreeNode<T>) => Promise<void>
  onEdit?: (node: TreeNode<T>) => Promise<void>
  onDelete?: (node: TreeNode<T>) => Promise<void>
  optimistic?: boolean
  
  onExpandAll?: () => void
  onCollapseAll?: () => void
  onViewSettings?: () => void
  className?: string
  styles?: Record<string, string>
  loadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>
}
```

#### Ejemplo de mapeo (Intention → TreeNode)

```ts
type Intention = {
  id: number
  code: string
  flow_name: string
  description: string
  ai_instructions: string
  priority: 'low' | 'medium' | 'high'
  type: string
}

// Agrupamos por type → flow → intention
const grouped = Object.values(
  intentions.reduce<Record<string, { id: string; label: string; children: any[] }>>((acc, it) => {
    const typeKey = it.type
    const flowKey = `${it.type}::${it.flow_name}`
    acc[typeKey] ||= { id: `type-${typeKey}`, label: typeKey, children: [] }
    let flowNode = acc[typeKey].children.find((c) => c.id === flowKey)
    if (!flowNode) {
      flowNode = { id: flowKey, label: it.flow_name, children: [] }
      acc[typeKey].children.push(flowNode)
    }
    flowNode.children.push(it)
    return acc
  }, {})
)

const data = grouped

const mapToNode = (item: any): TreeNode<Intention> => {
  if ('children' in item && Array.isArray(item.children)) {
    return { id: item.id, label: item.label, children: item.children.map(mapToNode) }
  }
  const i = item as Intention
  return {
    id: `int-${i.id}`,
    label: i.code,
    isLeaf: true,
    meta: i,
  }
}
```

#### Carga perezosa bajo demanda

```tsx
<TreeView
  data={rootNodes}
  mapToNode={(x) => x}
  loadChildren={async (node) => {
    const res = await fetch(`/parameters/intention?type=${node.label}&limit=20&offset=0`, { headers })
    const { data } = await res.json()
    return data.intentions.map((i: any) => ({ id: `int-${i.id}`, label: i.code, meta: i, isLeaf: true }))
  }}
/>
```

 

#### CRUD desacoplado

```tsx
<TreeView
  data={data}
  mapToNode={(x) => x}
  title="Product features tree"
  header={({ expandAll, collapseAll, viewSettings }) => (
    <div className="flex items-center gap-2">
      <button onClick={expandAll}>Expandir todo</button>
      <button onClick={collapseAll}>Colapsar todo</button>
      <button onClick={viewSettings}>Ver ajustes</button>
    </div>
  )}
  onCreate={async (parent, newLabel) => {/* abre modal y crea vía API */}}
  onEdit={async (node, newLabel) => {/* edición */}}
  onDelete={async (node) => {/* confirmación + delete */}}
/>
```

#### Notas de integración
- Endpoints: `GET/POST/PUT/DELETE /parameters/intention`.
- El componente no realiza llamadas de red; solo invoca callbacks.
- Para optimistic UI, pase `optimistic` y actualice su store local antes de resolver la promesa.

#### Limitaciones y decisiones
- Se previene recursión cíclica mediante un conjunto `visitedIds` durante el aplanado.

##### Ejemplo con endpoints existentes

```ts
async function createIntention(parent?: TreeNode<Intention>, newLabel?: string) {
  const res = await fetch(`/parameters/intention`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: newLabel, type: parent?.label }),
  })
  if (!res.ok) throw new Error('Error creating')
}

async function editIntention(node: TreeNode<Intention>, newLabel?: string) {
  const id = (node.meta as any)?.id
  const res = await fetch(`/parameters/intention/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: newLabel }),
  })
  if (!res.ok) throw new Error('Error updating')
}

async function deleteIntention(node: TreeNode<Intention>) {
  const id = (node.meta as any)?.id
  const res = await fetch(`/parameters/intention/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error deleting')
}

<TreeView
  data={data}
  mapToNode={(x) => x}
  optimistic
  onCreate={createIntention}
  onEdit={editIntention}
  onDelete={deleteIntention}
/>
```

#### UI de intención con prioridad

```tsx
<TreeView
  data={data}
  mapToNode={(x) => x}
  renderDescription={(n) => (n.meta as any)?.description}
  getPriority={(n) => (n.meta as any)?.priority}
  getIcon={(n) => n.isLeaf ? <span className="block h-3 w-3 rounded-sm bg-muted" /> : undefined}
/>
```