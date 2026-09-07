import { act, fireEvent, render, screen } from "@testing-library/react";

import { LocationSearch, type LocationSuggestion } from "@/shared/components/features/location/LocationSearch";

const PLACES: LocationSuggestion[] = [
  { id: "1", name: "Chapinero", detail: "Bogotá, Colombia", locality: "Bogotá", lat: 4.64, lng: -74.06, kind: "suburb" },
  { id: "2", name: "Chapinero Alto", detail: "Bogotá, Colombia", locality: "Bogotá", lat: 4.65, lng: -74.05, kind: "suburb" },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("LocationSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("no busca con menos de 3 letras y espera el debounce de 300 ms", async () => {
    const onSearch = jest.fn().mockResolvedValue(PLACES);
    render(<LocationSearch label="Dirección" onSearch={onSearch} onSelect={jest.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "ch" } });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "chapi" } });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(onSearch).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("chapi");
    expect(await screen.findAllByRole("option")).toHaveLength(2);
  });

  it("una respuesta rezagada no pisa a la búsqueda más reciente", async () => {
    const slow = deferred<LocationSuggestion[]>();
    const onSearch = jest
      .fn<Promise<LocationSuggestion[]>, [string]>()
      .mockImplementationOnce(() => slow.promise)
      .mockImplementationOnce(() => Promise.resolve([PLACES[1]]));
    render(<LocationSearch onSearch={onSearch} onSelect={jest.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "chapinero" } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    fireEvent.change(input, { target: { value: "chapinero alto" } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    // Llega tarde la primera: se ignora
    await act(async () => {
      slow.resolve(PLACES);
    });

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Chapinero Alto");
  });

  it("flechas + Enter eligen, avisan a onSelect y cierran la lista", async () => {
    const onSelect = jest.fn();
    render(<LocationSearch onSearch={jest.fn().mockResolvedValue(PLACES)} onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "chapinero" } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await screen.findAllByRole("option");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(PLACES[1]);
    // La lista se cierra (con animación de salida): el combobox ya no está expandido
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("Chapinero Alto");
  });

  it("si la búsqueda falla (429 del carril) queda «sin sugerencias», no un error", async () => {
    render(<LocationSearch onSearch={jest.fn().mockRejectedValue(new Error("429"))} onSelect={jest.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "usaquen" } });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
