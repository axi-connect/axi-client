import type { ReactNode } from "react";

/** El slot @form renderiza el modal interceptado de nueva actividad/tarea. */
export default function CrmTasksLayout({
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
