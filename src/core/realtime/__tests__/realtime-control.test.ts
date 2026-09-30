/**
 * `realtime-control`: AuthProvider frena y rearma el tiempo real sin importar
 * socket.io. Se prueban los dos órdenes: con el gestor ya cargado y con la
 * suspensión llegando ANTES de que el gestor exista.
 */
import {
  __resetRealtimeControlForTests,
  haltRealtime,
  registerRealtimeControl,
  resetRealtime,
} from "../realtime-control"

function fakeManager() {
  return { halt: jest.fn(), reset: jest.fn() }
}

beforeEach(() => __resetRealtimeControlForTests())

it("con el gestor cargado, halt y reset llegan al gestor", () => {
  const m = fakeManager()
  registerRealtimeControl(m)
  haltRealtime()
  resetRealtime()
  expect(m.halt).toHaveBeenCalledTimes(1)
  expect(m.reset).toHaveBeenCalledTimes(1)
})

it("un halt previo a la carga del gestor se aplica al registrarse", () => {
  haltRealtime()
  const m = fakeManager()
  registerRealtimeControl(m)
  expect(m.halt).toHaveBeenCalledTimes(1)
})

it("un reset posterior al halt cancela el halt pendiente", () => {
  haltRealtime()
  resetRealtime()
  const m = fakeManager()
  registerRealtimeControl(m)
  expect(m.halt).not.toHaveBeenCalled()
})

it("sin halt previo, registrar el gestor no lo detiene", () => {
  const m = fakeManager()
  registerRealtimeControl(m)
  expect(m.halt).not.toHaveBeenCalled()
})
