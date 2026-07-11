export default function QuickActionsLayout({
  children,
  form,
}: {
  children: React.ReactNode
  form: React.ReactNode
}) {
  return (
    <>
      {children}
      {form}
    </>
  )
}
