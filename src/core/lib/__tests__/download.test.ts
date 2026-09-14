import { triggerDownload } from "../download";

describe("triggerDownload", () => {
  it("crea un ancla same-origin con download vacío, hace clic y la retira del DOM", () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const appended: HTMLAnchorElement[] = [];
    const append = jest.spyOn(document.body, "appendChild").mockImplementation((node) => {
      appended.push(node as HTMLAnchorElement);
      return node;
    });

    triggerDownload("/api/proxy/crm/imports/template");

    expect(click).toHaveBeenCalledTimes(1);
    expect(appended).toHaveLength(1);
    const anchor = appended[0]!;
    expect(anchor.getAttribute("href")).toBe("/api/proxy/crm/imports/template");
    // Vacío a propósito: el nombre lo pone el Content-Disposition del backend
    expect(anchor.getAttribute("download")).toBe("");
    expect(anchor.rel).toBe("noopener");
    expect(document.body.contains(anchor)).toBe(false);

    append.mockRestore();
    click.mockRestore();
  });
});
