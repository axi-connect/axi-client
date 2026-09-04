import { render } from "@testing-library/react"

import CallsLayout from "../calls/layout"
import SchedulingLayout from "../scheduling/layout"
import SchedulingCalendarLayout from "../scheduling/calendar/layout"
import SchedulingRemindersLayout from "../scheduling/reminders/layout"

jest.mock("@/modules/calls/ui/CallsNav", () => ({ CallsNav: () => <nav /> }))
jest.mock("@/modules/scheduling/ui/SchedulingNav", () => ({ SchedulingNav: () => <nav /> }))

/**
 * El contrato de scroll de DESIGN-SYSTEM §4.2, blindado donde ya se rompió tres
 * veces: un shell de SECCIÓN no declara el modo de vista, lo propaga. Cuando lo
 * declaraba, le imponía un scroller propio a las rutas documentales
 * (`/calls/settings`, `/scheduling/settings`) y salían dos barras apiladas más
 * la franja vacía de abajo.
 */
describe("shells de sección: propiedad del scroll", () => {
  it.each([
    ["Llamadas", CallsLayout],
    ["Agenda", SchedulingLayout],
  ])("el shell de %s no declara `data-app-view`: lo propaga con :has()", (_name, Layout) => {
    const { container } = render(<Layout>{<p>contenido</p>}</Layout>)

    expect(container.querySelector("[data-app-view]")).toBeNull()

    // Sin marcador, ningún nivel del shell puede ser scroller: las documentales
    // crecen y las scrollea el único `[data-app-scroll]` del panel.
    for (const node of container.querySelectorAll("div")) {
      expect(node.className).not.toMatch(/overflow-y-auto/)
    }

    // Y el modo aplicación llega por propagación, no por decreto.
    expect(container.firstElementChild?.className).toContain("has-[[data-app-view]]:min-h-0")
  })

  it.each([
    ["el calendario", SchedulingCalendarLayout],
    ["los recordatorios", SchedulingRemindersLayout],
  ])("%s sí se declara vista de aplicación, porque garantiza su scroller interno", (_name, Layout) => {
    const { container } = render(
      <Layout sheet={null} form={null}>
        <p>contenido</p>
      </Layout>,
    )

    const marked = container.querySelector("[data-app-view]")
    expect(marked).not.toBeNull()
    // Topado y sin porcentajes: la altura la reparte flex (§4.2).
    expect(marked).toHaveClass("min-h-0", "flex-1", "overflow-hidden")
    expect(marked?.className).not.toMatch(/h-full/)
  })
})
