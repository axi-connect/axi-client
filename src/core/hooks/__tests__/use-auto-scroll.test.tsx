import { render } from "@testing-library/react";

import { useAutoScroll } from "../use-auto-scroll";

/**
 * El auto-scroll del chat desplaza SOLO su contenedor. Con `scrollIntoView`
 * se movía además el scroller del panel y la página entera subía (simulacro
 * de quality y chats de Axel/Alba en pantallas bajas).
 */

function Chat({ count }: { count: number }) {
  const { containerRef, bottomRef } = useAutoScroll<HTMLDivElement>({ deps: [count] });
  return (
    <div ref={containerRef} data-testid="box">
      {Array.from({ length: count }, (_, i) => (
        <p key={i}>m{i}</p>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

describe("useAutoScroll", () => {
  const scrollTo = jest.fn();
  const scrollIntoView = jest.fn();
  const originalScrollTo = Element.prototype.scrollTo;
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    scrollTo.mockClear();
    scrollIntoView.mockClear();
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterAll(() => {
    Element.prototype.scrollTo = originalScrollTo;
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("al montar y con cada mensaje nuevo desplaza el contenedor, nunca con scrollIntoView", () => {
    const { rerender, getByTestId } = render(<Chat count={2} />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.contexts[0]).toBe(getByTestId("box"));

    rerender(<Chat count={3} />);
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
