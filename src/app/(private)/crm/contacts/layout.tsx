import type { ReactNode } from "react";

/** El slot @form renderiza los modales interceptados de crear/editar contacto. */
export default function CrmContactsLayout({
  children,
  form,
}: {
  children: ReactNode;
  form: ReactNode;
}) {
  return (
    <>
      {children}
      {form}
    </>
  );
}
