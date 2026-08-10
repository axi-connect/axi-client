import { FacebookSdkError } from "@/modules/channels/domain/meta-signup";
import { loadFacebookSdk, resetFacebookSdkForTests } from "../facebook-sdk";

/**
 * El cargador es la pieza de la que depende D2: el botón no se habilita hasta
 * que este archivo resuelve. Lo que se asserta es el mecanismo de los tres
 * modos de fallo que se pagan caros:
 *
 *  - dos cargas concurrentes que inyectan dos `<script>` (React 19 en
 *    StrictMode monta dos veces, así que esto no es hipotético),
 *  - un bloqueador que devuelve 200 sin dejar el global,
 *  - una red que cuelga la petición y nunca resuelve.
 */
describe("loadFacebookSdk", () => {
  const APP_ID = "1234567890";
  const VERSION = "v21.0";

  function scripts(): HTMLScriptElement[] {
    return Array.from(document.querySelectorAll("script#facebook-jssdk"));
  }

  beforeEach(() => {
    jest.useFakeTimers();
    resetFacebookSdkForTests();
    document.head.innerHTML = "";
    delete window.FB;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("dos llamadas concurrentes inyectan UN solo script y comparten la promesa", async () => {
    const first = loadFacebookSdk(APP_ID, VERSION);
    const second = loadFacebookSdk(APP_ID, VERSION);

    expect(scripts()).toHaveLength(1);

    const init = jest.fn();
    window.FB = { init, login: jest.fn() };
    scripts()[0].dispatchEvent(new Event("load"));

    await expect(first).resolves.toBe(window.FB);
    await expect(second).resolves.toBe(window.FB);
    // Una sola inicialización: dos `FB.init` sobre el mismo global es la forma
    // de que la segunda configuración pise a la primera en silencio
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("inicializa sin cookies y sin xfbml", async () => {
    const promise = loadFacebookSdk(APP_ID, VERSION);
    const init = jest.fn();
    window.FB = { init, login: jest.fn() };
    scripts()[0].dispatchEvent(new Event("load"));
    await promise;

    // `cookie: false` es deliberado: no queremos cookies de sesión de Facebook
    // escritas en nuestro dominio
    expect(init).toHaveBeenCalledWith({
      appId: APP_ID,
      version: VERSION,
      xfbml: false,
      cookie: false,
      autoLogAppEvents: false,
    });
  });

  it("sin app_id falla ANTES de tocar el DOM", async () => {
    await expect(loadFacebookSdk(null, VERSION)).rejects.toBeInstanceOf(FacebookSdkError);
    await expect(loadFacebookSdk("   ", VERSION)).rejects.toMatchObject({ reason: "no_app_id" });
    expect(scripts()).toHaveLength(0);
  });

  it("un script que carga pero no deja el global es un bloqueador", async () => {
    const promise = loadFacebookSdk(APP_ID, VERSION);
    // 200 con cuerpo vacío: el `load` dispara y `window.FB` sigue sin existir
    scripts()[0].dispatchEvent(new Event("load"));

    await expect(promise).rejects.toMatchObject({ reason: "blocked" });
  });

  it("un error de red produce el fallo tipado `blocked`", async () => {
    const promise = loadFacebookSdk(APP_ID, VERSION);
    scripts()[0].dispatchEvent(new Event("error"));

    await expect(promise).rejects.toMatchObject({ reason: "blocked" });
  });

  it("un `onload` que nunca llega expira a los 15 s con error tipado", async () => {
    const promise = loadFacebookSdk(APP_ID, VERSION);
    const assertion = expect(promise).rejects.toMatchObject({ reason: "timeout" });

    // Con timers falsos, no esperando de verdad: un test que tarde 15 segundos
    // acaba borrado por lento
    jest.advanceTimersByTime(15_000);
    await assertion;
  });

  it("un fallo NO se memoiza: el reintento vuelve a cargar", async () => {
    const failed = loadFacebookSdk(APP_ID, VERSION);
    scripts()[0].dispatchEvent(new Event("error"));
    await expect(failed).rejects.toBeInstanceOf(FacebookSdkError);
    // El `catch` que limpia la memoización es asíncrono
    await Promise.resolve();

    document.head.innerHTML = "";
    const retried = loadFacebookSdk(APP_ID, VERSION);
    // Si el rechazo quedara cacheado, el botón de "volver a intentar" no
    // funcionaría nunca sin recargar la página
    expect(scripts()).toHaveLength(1);

    window.FB = { init: jest.fn(), login: jest.fn() };
    scripts()[0].dispatchEvent(new Event("load"));
    await expect(retried).resolves.toBeDefined();
  });

  it("si el SDK ya estaba en la página lo reutiliza sin inyectar script", async () => {
    const init = jest.fn();
    window.FB = { init, login: jest.fn() };

    await expect(loadFacebookSdk(APP_ID, VERSION)).resolves.toBe(window.FB);
    expect(scripts()).toHaveLength(0);
    expect(init).toHaveBeenCalledTimes(1);
  });
});
