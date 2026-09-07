import type { CompanyDTO } from "@/modules/companies/domain/company";

const getMyCompany = jest.fn<Promise<CompanyDTO>, []>();
jest.mock("@/modules/companies/infrastructure/services/company-service.adapter", () => ({
  getMyCompany: () => getMyCompany(),
}));

import {
  resetMyCompanyStore,
  useMyCompanyStore,
} from "@/modules/companies/infrastructure/stores/my-company.store";
import {
  invalidateMyCompanyCache,
  loadMyCompanyOnce,
} from "@/modules/companies/infrastructure/services/company-cache";

const company = (name: string) => ({ id: "co-1", name, status: "active" }) as unknown as CompanyDTO;

describe("my-company.store", () => {
  beforeEach(() => {
    resetMyCompanyStore();
    getMyCompany.mockReset();
  });

  it("una sola petición aunque la pidan varios a la vez (single-flight)", async () => {
    getMyCompany.mockResolvedValue(company("Savage"));
    const store = useMyCompanyStore.getState();

    const [a, b] = await Promise.all([store.load(), loadMyCompanyOnce()]);

    expect(getMyCompany).toHaveBeenCalledTimes(1);
    expect(a.name).toBe("Savage");
    expect(b).toBe(a);
    expect(useMyCompanyStore.getState().status).toBe("ready");
  });

  it("refresh() vuelve a pedir y actualiza el estado que leen sidebar y banner", async () => {
    getMyCompany.mockResolvedValueOnce(company("Antes")).mockResolvedValueOnce(company("Después"));
    await useMyCompanyStore.getState().load();

    await useMyCompanyStore.getState().refresh();

    expect(getMyCompany).toHaveBeenCalledTimes(2);
    expect(useMyCompanyStore.getState().company?.name).toBe("Después");
  });

  it("invalidate() olvida lo cargado: el próximo load re-fetchea", async () => {
    getMyCompany.mockResolvedValue(company("Savage"));
    await loadMyCompanyOnce();
    invalidateMyCompanyCache();
    expect(useMyCompanyStore.getState().company).toBeNull();

    await loadMyCompanyOnce();

    expect(getMyCompany).toHaveBeenCalledTimes(2);
  });

  it("un fallo deja status=error y NO se queda pegado: el siguiente load reintenta", async () => {
    getMyCompany.mockRejectedValueOnce(new Error("403")).mockResolvedValueOnce(company("Savage"));

    await expect(useMyCompanyStore.getState().load()).rejects.toThrow("403");
    expect(useMyCompanyStore.getState().status).toBe("error");

    await expect(useMyCompanyStore.getState().load()).resolves.toMatchObject({ name: "Savage" });
  });
});
