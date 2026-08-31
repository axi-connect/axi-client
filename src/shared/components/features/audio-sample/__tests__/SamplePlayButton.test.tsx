import { fireEvent, render, screen } from "@testing-library/react";
import { SamplePlayButton } from "../SamplePlayButton";

describe("SamplePlayButton", () => {
  it("con URL: alterna los aria-label de escuchar/detener y dispara onToggle", () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <SamplePlayButton name="Valentina" url="https://s3/a.ogg" playing={false} loading={false} onToggle={onToggle} />,
    );
    const play = screen.getByRole("button", { name: "Escuchar muestra de Valentina" });
    fireEvent.click(play);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <SamplePlayButton name="Valentina" url="https://s3/a.ogg" playing loading={false} onToggle={onToggle} />,
    );
    expect(screen.getByRole("button", { name: "Detener muestra de Valentina" })).toBeInTheDocument();
  });

  it("sin URL: deshabilitado y explicado, jamás oculto", () => {
    render(
      <SamplePlayButton name="Carlota" url={null} playing={false} loading={false} onToggle={jest.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Muestra de Carlota pendiente" })).toBeDisabled();
  });

  it("el click NO se propaga al contenedor (vive dentro de items seleccionables)", () => {
    const onParent = jest.fn();
    render(
      <div onClick={onParent}>
        <SamplePlayButton name="Valentina" url="https://s3/a.ogg" playing={false} loading={false} onToggle={jest.fn()} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Escuchar muestra de Valentina" }));
    expect(onParent).not.toHaveBeenCalled();
  });
});
