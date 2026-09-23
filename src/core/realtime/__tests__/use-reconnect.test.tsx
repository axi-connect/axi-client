import { render } from "@testing-library/react";

import { useReconnect } from "../use-reconnect";

function Probe({
  connected,
  onReconnect,
}: {
  connected: boolean;
  onReconnect: () => void;
}) {
  useReconnect(connected, onReconnect);
  return null;
}

describe("useReconnect", () => {
  it("la PRIMERA conexión no dispara: la vista acaba de pedir sus datos", () => {
    const onReconnect = jest.fn();
    const view = render(<Probe connected={false} onReconnect={onReconnect} />);
    view.rerender(<Probe connected onReconnect={onReconnect} />);
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("true → false → true SÍ dispara (el bug viejo exigía dos ticks conectados seguidos)", () => {
    const onReconnect = jest.fn();
    const view = render(<Probe connected onReconnect={onReconnect} />);
    view.rerender(<Probe connected={false} onReconnect={onReconnect} />);
    expect(onReconnect).not.toHaveBeenCalled();
    view.rerender(<Probe connected onReconnect={onReconnect} />);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("un re-render sin cambio de conexión no dispara, y usa el callback más reciente", () => {
    const first = jest.fn();
    const second = jest.fn();
    const view = render(<Probe connected onReconnect={first} />);
    view.rerender(<Probe connected onReconnect={second} />);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    view.rerender(<Probe connected={false} onReconnect={second} />);
    view.rerender(<Probe connected onReconnect={second} />);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
