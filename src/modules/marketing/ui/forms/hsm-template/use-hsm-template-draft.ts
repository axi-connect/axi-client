"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import type { FormStepState, StepProgressCheck } from "@/shared/components/features/form-steps";
import { HSM_CATEGORY_LABELS } from "@/modules/marketing/domain/enums";
import { HEADER_MEDIA_RULES, validateHeaderMediaFile, type HeaderMediaKind } from "@/modules/marketing/domain/header-media";
import {
  firstMissingExample,
  hsmDraftErrors,
  stepsWithErrors,
  type HsmDraftErrors,
} from "@/modules/marketing/domain/hsm-template-draft";
import {
  classifyHsmSubmitError,
  HSM_REJECT_REASONS,
  type HsmFormStep,
  type HsmSubmitFailure,
} from "@/modules/marketing/domain/meta-template-view";
import {
  inspectTemplateVariables,
  rejectionReasonLabel,
  SUGGESTED_OPENING_TEMPLATES,
  TEMPLATE_COST_CO_USD,
  type HsmHeaderMediaUploadDTO,
  type HsmLibraryTemplateDTO,
  type HsmTemplateDTO,
  type UpdateHsmTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import { isStillLibrary, libraryDraft } from "@/modules/marketing/domain/template-library";
import {
  composeTemplateName,
  firstFreeVersion,
  formatTemplateBase,
  humanizeTemplateBase,
  splitTemplateName,
  versionOptions,
} from "@/modules/marketing/domain/template-name";
import {
  BODY_MAX,
  groupButtons,
  readBodyExamples,
  readTemplatePieces,
  type TemplateButton,
} from "@/modules/marketing/domain/template-pieces";
import {
  createHsmTemplate,
  listHsmLibrary,
  listHsmTemplates,
  updateHsmTemplate,
  uploadHsmHeaderMedia,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import { reportQuotaExceeded } from "@/modules/storage/public";
import type { HeaderMediaStatus } from "./HeaderMediaField";

type Category = HsmTemplateDTO["category"];
export type HeaderKind = "none" | "text" | HeaderMediaKind;

const MEDIA_KINDS = new Set<HeaderKind>(["image", "video", "document"]);

function isMediaKind(kind: HeaderKind): kind is HeaderMediaKind {
  return MEDIA_KINDS.has(kind);
}

/** El archivo de la cabecera que hay ahora: el recién subido o el guardado con la plantilla. */
type HeaderFile = Omit<HsmHeaderMediaUploadDTO, "preview_url"> & {
  preview_url: string | null;
  /** Object URL del archivo recién elegido: la previa sin esperar a la firmada. */
  local_url: string | null;
};

const HEADER_KIND_LABEL: Record<HeaderMediaKind, string> = { image: "imagen", video: "video", document: "documento" };

/**
 * La biblioteca de Meta del canal (F5): se pide sola al abrir la página de
 * crear, sin bloquearla. `off` al editar: una plantilla existente no «empieza
 * desde» nada. Un fallo no rompe la página: la fila sigue con lo de axi y la
 * hoja ofrece reintentar.
 */
export type LibraryState =
  | { kind: "off" }
  | { kind: "loading" }
  | { kind: "ready"; items: readonly HsmLibraryTemplateDTO[] }
  | { kind: "error"; message: string };

export const LANGUAGES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "es_CO", label: "Español (Colombia)" },
  { value: "es_MX", label: "Español (México)" },
  { value: "es", label: "Español" },
  { value: "en_US", label: "Inglés (Estados Unidos)" },
];

/** Un paso de la página: su número y su título. El orden es el de la maqueta. */
const STEPS: ReadonlyArray<{ key: HsmFormStep; number: number; title: string }> = [
  { key: "purpose", number: 1, title: "¿Para qué es?" },
  { key: "message", number: 2, title: "El mensaje" },
  { key: "ficha", number: 3, title: "Ficha" },
];

function priceLabel(category: Category): string {
  return `US$ ${TEMPLATE_COST_CO_USD[category].toLocaleString("es-CO", { maximumFractionDigits: 4 })}`;
}

/** Lo que falta, nombrado: la línea de la isla (DESIGN-SYSTEM §9.7, «qué falta nombrado»). */
function whatIsMissing(
  errors: HsmDraftErrors,
  context: {
    messageEmpty: boolean;
    baseEmpty: boolean;
    missingExample: number | null;
    isEditing: boolean;
    mediaWithoutCopy: HeaderMediaKind | null;
    /** De la biblioteca y sin tocar su texto: Meta la aprueba al enviarla. */
    libraryInstant: boolean;
  },
): string {
  if (context.messageEmpty && context.baseEmpty) return "Falta el texto y el nombre";
  if (context.messageEmpty) return "Falta el texto";
  if (context.missingExample !== null) return `Falta el ejemplo de {{${String(context.missingExample)}}}`;
  if (errors.body !== undefined) return errors.body;
  if (errors.header !== undefined) return errors.header;
  if (errors.footer !== undefined) return errors.footer;
  if (errors.buttons !== undefined) return errors.buttons;
  if (context.baseEmpty) return "Falta el nombre";
  if (errors.name !== undefined) return errors.name;
  if (context.mediaWithoutCopy !== null) return `Sin el archivo, ${HEADER_MEDIA_RULES[context.mediaWithoutCopy].noun} no sale en los envíos`;
  if (context.libraryInstant) return "Se aprueba al instante";
  return context.isEditing ? "Se envía de nuevo a revisión" : "Se envía a revisión de Meta";
}

/**
 * Cómo viaja una pieza que el operador dejó vacía. Al CREAR se omite: no hay
 * nada que borrar. Al EDITAR se manda `null`, que es lo que el servidor entiende
 * como «quítala» — omitirla la conservaría, porque editar reemplaza todos los
 * componentes en Meta.
 */
function pieceUpdate<T>(key: string, value: T | null, isEditing: boolean): Record<string, T | null> {
  if (value !== null) return { [key]: value };
  return isEditing ? { [key]: null } : {};
}

/**
 * El estado y las reglas de la página de una plantilla de Meta (hsm-media F4):
 * lo que el operador escribe, lo que se deriva (nombre y versión, errores,
 * tramos de la isla, qué falta) y las acciones (subir el archivo de la
 * cabecera, enviar, comprobar si llegó). `HsmTemplateForm` solo pinta.
 *
 * Existe para que el componente no cargue a la vez el pintado y una veintena de
 * estados (auditoría F3, Q1): la validación ya era dominio puro; esto aparta lo
 * demás antes de que la subida de F4 lo hiciera inmanejable.
 */
export function useHsmTemplateDraft({
  channelId,
  templates: initialTemplates,
  editing,
  onSaved,
  onDirtyChange,
}: {
  channelId: string;
  templates: readonly HsmTemplateDTO[];
  editing: HsmTemplateDTO | null;
  onSaved: (template: HsmTemplateDTO) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const isEditing = editing !== null;
  const isFixing = editing?.approval_status === "rejected";
  const editingName = editing === null ? null : splitTemplateName(editing.name);
  const stored = useMemo(() => readTemplatePieces(editing?.components), [editing]);
  const nameRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<readonly HsmTemplateDTO[]>(initialTemplates);
  const [human, setHuman] = useState(editingName === null ? "" : humanizeTemplateBase(editingName.base));
  const [versionChoice, setVersionChoice] = useState<number | null>(null);
  // Lo que Meta dijo que está reservado (el 409 al enviar): la lista no trae las
  // borradas, así que solo se sabe al chocar. Clave `base|idioma`.
  const [reserved, setReserved] = useState<ReadonlyMap<string, ReadonlyMap<number, string | null>>>(new Map());
  const [language, setLanguage] = useState(editing?.language ?? "es_CO");
  const [category, setCategory] = useState<Category>(editing?.category ?? "utility");
  const [body, setBody] = useState(editing?.body ?? "");
  // Al editar, los ejemplos que ya tiene: corregir no obliga a reescribirlos.
  const [examples, setExamples] = useState<string[]>(() => readBodyExamples(editing?.components));
  // La cabecera: de qué clase, su texto, y el archivo si es de medio.
  const storedKind: HeaderKind = stored.headerMedia?.kind ?? (stored.header !== null ? "text" : "none");
  const storedFile = useMemo<HeaderFile | null>(() => {
    const media = editing?.header_media ?? null;
    if (media === null || media.kind !== stored.headerMedia?.kind) return null;
    return {
      handle: media.handle,
      storage_key: media.storage_key,
      kind: media.kind,
      mime_type: media.mime_type,
      byte_size: media.byte_size,
      file_name: media.file_name ?? `cabecera.${media.mime_type.split("/")[1] ?? "bin"}`,
      preview_url: media.preview_url,
      local_url: null,
    };
  }, [editing, stored.headerMedia]);
  const [headerKind, setHeaderKind] = useState<HeaderKind>(storedKind);
  const [headerText, setHeaderText] = useState(stored.header ?? "");
  const [headerFile, setHeaderFile] = useState<HeaderFile | null>(storedFile);
  const [mediaStatus, setMediaStatus] = useState<HeaderMediaStatus>({ kind: "idle" });
  // Una subida que llega tarde (se eligió otro archivo, o se cambió de clase) no pisa la actual.
  const uploadTicket = useRef(0);
  // La previa local se libera al salir de la página, no solo al reemplazarla.
  const latestFile = useRef<HeaderFile | null>(headerFile);
  useEffect(() => {
    latestFile.current = headerFile;
  }, [headerFile]);
  useEffect(
    () => () => {
      if (latestFile.current?.local_url) URL.revokeObjectURL(latestFile.current.local_url);
    },
    [],
  );
  const [footer, setFooter] = useState<string | null>(stored.footer);
  const [buttons, setButtons] = useState<TemplateButton[]>(stored.buttons);
  const [origin, setOrigin] = useState<string | null>(null);
  // La plantilla de la biblioteca de la que se partió (F5): con ella se decide
  // si el envío lleva `library_template_name` (aprobación al instante) o no.
  const [libraryOrigin, setLibraryOrigin] = useState<HsmLibraryTemplateDTO | null>(null);
  // El ejemplo del `{{1}}` de una cabecera de la biblioteca: el formulario no
  // tiene campo para él, y sin ejemplo Meta rechaza una cabecera con hueco.
  const [headerExample, setHeaderExample] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryState>(isEditing ? { kind: "off" } : { kind: "loading" });
  const [libraryAttempt, setLibraryAttempt] = useState(0);

  // La biblioteca, una vez por canal (y por reintento): no bloquea la página, y lo que llega
  // tarde de un canal anterior no pisa al actual.
  useEffect(() => {
    if (isEditing) return;
    let alive = true;
    void (async () => {
      try {
        const items = await listHsmLibrary(channelId);
        if (alive) setLibrary({ kind: "ready", items });
      } catch (err) {
        if (alive) setLibrary({ kind: "error", message: errorMessage(err, "No pudimos traer la biblioteca de Meta") });
      }
    })();
    return () => {
      alive = false;
    };
  }, [channelId, isEditing, libraryAttempt]);

  const [startCollapsed, setStartCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Guarda síncrona: `submitting` es estado y no llega a tiempo para el segundo
  // clic del mismo tick. Un segundo POST crea en Meta otra vez (incidente 2026-09-28).
  const inFlight = useRef(false);
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<HsmSubmitFailure | null>(null);
  // El nombre con que se envió cuando falló: el aviso habla de ESE, aunque el
  // selector ya haya saltado a la siguiente versión libre.
  const [failedName, setFailedName] = useState("");
  const [checking, setChecking] = useState(false);
  // Todos abiertos al llegar, como el alta de producto: el operador pliega lo que ya resolvió.
  const [openSteps, setOpenSteps] = useState<Record<HsmFormStep, boolean>>({
    purpose: !isEditing,
    message: true,
    ficha: !isEditing,
  });

  const base = editingName?.base ?? formatTemplateBase(human);
  const reservedHere = reserved.get(`${base}|${language}`);
  const options = useMemo(
    () => versionOptions(base, language, templates, reservedHere),
    [base, language, templates, reservedHere],
  );
  const chosenIsFree = versionChoice !== null && options.some((option) => option.version === versionChoice && option.taken === null);
  const version = editingName !== null ? editingName.version : chosenIsFree ? versionChoice : firstFreeVersion(options);
  const name = editing !== null ? editing.name : base === "" ? "" : composeTemplateName(base, version ?? 1);

  const verdict = useMemo(() => inspectTemplateVariables(body), [body]);
  const variableCount = verdict.ok ? verdict.count : 0;
  const categoryLocked = isEditing && editing.approval_status === "approved";
  const header = headerKind === "text" ? headerText : null;
  const mediaKind = isMediaKind(headerKind) ? headerKind : null;
  // Al editar, una cabecera de medio que no se tocó NO se manda: el servidor la
  // conserva (con su medio, o sin él si se creó fuera de axi).
  const mediaUnchanged =
    isEditing &&
    mediaKind !== null &&
    headerKind === storedKind &&
    (headerFile?.storage_key ?? null) === (storedFile?.storage_key ?? null);
  // Una cabecera de medio creada fuera de axi sin copia: guardar es válido,
  // pero cada envío saldría sin ella y Meta lo rechazaría. Se avisa sin bloquear.
  const mediaWithoutCopy =
    isEditing && mediaKind !== null && mediaKind === storedKind && storedFile === null && headerFile === null
      ? mediaKind
      : null;
  const headerMediaDraft =
    mediaKind === null
      ? null
      : { ready: headerFile !== null || mediaUnchanged, uploading: mediaStatus.kind === "uploading" };
  const errors: HsmDraftErrors = hsmDraftErrors({
    base,
    name,
    body,
    examples,
    header,
    headerMedia: headerMediaDraft,
    footer,
    buttons,
  });
  const errorSteps = stepsWithErrors(errors);
  // De la biblioteca: sin tocar (aprobación al instante) o tocada (revisión normal).
  const stillLibrary =
    libraryOrigin !== null &&
    isStillLibrary(libraryOrigin, { category, language, header, hasMediaHeader: mediaKind !== null, body, footer, buttons });
  const libraryInstant = !isEditing && stillLibrary;
  const libraryChanged = !isEditing && libraryOrigin !== null && !stillLibrary;
  const invalid = errorSteps.size > 0;
  const missingExample = firstMissingExample(examples, variableCount);
  const categoryLabel = HSM_CATEGORY_LABELS[category];

  // Sucio = distinto de como llegó. Al guardar se limpia antes de navegar.
  const snapshot = JSON.stringify([human, language, category, body, examples, headerKind, headerText, headerFile?.storage_key ?? null, footer, buttons]);
  const initialSnapshot = useRef(snapshot);
  const dirty = snapshot !== initialSnapshot.current;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  function goToStep(step: HsmFormStep, focusId?: string) {
    setOpenSteps((previous) => ({ ...previous, [step]: true }));
    // Tras pintar el paso abierto: el campo existe siempre (`hidden`), pero el foco va cuando se ve.
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(`hsm-step-${step}`)?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      if (focusId !== undefined) document.getElementById(focusId)?.focus({ preventScroll: true });
      else if (step === "ficha") nameRef.current?.focus({ preventScroll: true });
    });
  }

  /** Lo que una plantilla de la biblioteca había puesto y una sugerida o «en blanco» no traen. */
  function clearLibraryPieces() {
    if (libraryOrigin === null) return;
    setLibraryOrigin(null);
    changeHeaderKind("none");
    setHeaderText("");
    setHeaderExample(null);
    setFooter(null);
    setButtons([]);
  }

  function applySuggestion(key: string) {
    const suggestion = SUGGESTED_OPENING_TEMPLATES.find((item) => item.key === key);
    if (suggestion === undefined) return;
    clearLibraryPieces();
    setHuman(humanizeTemplateBase(splitTemplateName(suggestion.name).base));
    setVersionChoice(null);
    setBody(suggestion.body);
    setCategory("utility");
    setExamples([...suggestion.examples]);
    setOrigin(key);
    setStartCollapsed(true);
    setFailure(null);
  }

  /**
   * Partir de una plantilla de la biblioteca de Meta (F5): la página se llena
   * con su texto, sus ejemplos, sus botones, Utilidad y `es` —el idioma con que
   * Meta la aprueba al instante—. Si había un archivo de cabecera, se suelta
   * (`changeHeaderKind`): la biblioteca solo trae cabeceras de texto.
   */
  function applyLibrary(template: HsmLibraryTemplateDTO) {
    const draft = libraryDraft(template);
    setLibraryOrigin(template);
    setHuman(draft.suggestedName);
    setVersionChoice(null);
    setCategory(draft.category);
    setLanguage(draft.language);
    changeHeaderKind(draft.headerText !== null ? "text" : "none");
    setHeaderText(draft.headerText ?? "");
    setHeaderExample(draft.headerExample);
    setBody(draft.body);
    setExamples(draft.examples);
    setFooter(draft.footer);
    setButtons(draft.buttons);
    setOrigin(null);
    setStartCollapsed(true);
    setFailure(null);
  }

  function retryLibrary() {
    setLibrary({ kind: "loading" });
    setLibraryAttempt((previous) => previous + 1);
  }

  function startBlank() {
    // «En blanco» es empezar de cero: si venía de una sugerida o de la biblioteca, se limpia.
    if (origin !== null || libraryOrigin !== null) {
      setHuman("");
      setBody("");
      setExamples([]);
    }
    clearLibraryPieces();
    setOrigin(null);
    setStartCollapsed(true);
    setFailure(null);
  }

  function insertVariable() {
    const next = variableCount + 1;
    setBody((previous) => `${previous}${previous.endsWith(" ") || previous === "" ? "" : " "}{{${String(next)}}}`);
  }

  /**
   * Cómo viaja la cabecera: nada (se conserva), texto, el medio con su copia de
   * axi, o `null` al editar para quitarla. Al CREAR nunca es `null`: no hay
   * nada que quitar.
   */
  function headerUpdate(): Pick<UpdateHsmTemplateDTO, "header" | "header_media"> {
    if (mediaKind !== null) {
      if (mediaUnchanged || headerFile === null) return {};
      return {
        header: { format: mediaKind, handle: headerFile.handle },
        header_media: {
          mode: "fixed" as const,
          kind: headerFile.kind,
          storage_key: headerFile.storage_key,
          mime_type: headerFile.mime_type,
          byte_size: headerFile.byte_size,
          handle: headerFile.handle,
          file_name: headerFile.file_name,
        },
      };
    }
    if (header !== null) {
      // Una cabecera con hueco (las hay en la biblioteca) necesita su ejemplo, o Meta la rechaza.
      const example = /\{\{1\}\}/.test(header) && headerExample !== null ? { example: headerExample } : {};
      return { header: { format: "text", text: header, ...example } };
    }
    return isEditing ? { header: null } : {};
  }

  function changeHeaderKind(next: HeaderKind) {
    setHeaderKind(next);
    // El archivo es de UNA clase: al cambiar, el de otra clase se suelta.
    if (headerFile !== null && headerFile.kind !== next) {
      releaseLocal(headerFile);
      setHeaderFile(next === storedFile?.kind ? storedFile : null);
    } else if (headerFile === null && next === storedFile?.kind) {
      setHeaderFile(storedFile);
    }
    uploadTicket.current += 1;
    setMediaStatus({ kind: "idle" });
  }

  function releaseLocal(file: HeaderFile | null) {
    if (file?.local_url) URL.revokeObjectURL(file.local_url);
  }

  /** Se valida ANTES de subir; subido, el servidor guarda la copia de axi y Meta da el handle. */
  async function pickHeaderFile(file: File) {
    if (mediaKind === null) return;
    const invalidFile = validateHeaderMediaFile(file, mediaKind);
    if (invalidFile !== null) {
      setMediaStatus({ kind: "error", message: invalidFile });
      return;
    }
    const ticket = ++uploadTicket.current;
    const localUrl = mediaKind === "image" ? URL.createObjectURL(file) : null;
    setMediaStatus({ kind: "uploading", fileName: file.name, localUrl });
    try {
      const uploaded = await uploadHsmHeaderMedia(channelId, file);
      if (ticket !== uploadTicket.current) {
        if (localUrl !== null) URL.revokeObjectURL(localUrl);
        return;
      }
      releaseLocal(headerFile);
      setHeaderFile({ ...uploaded, local_url: localUrl });
      setMediaStatus({ kind: "idle" });
    } catch (err) {
      if (localUrl !== null) URL.revokeObjectURL(localUrl);
      if (ticket !== uploadTicket.current) return;
      // Solo un error del servidor trae un motivo que leer; uno de red o del
      // navegador («Failed to fetch») no se enseña crudo.
      // 507 con el espacio lleno: la píldora con «Ver espacio» y el subidor apagado.
      reportQuotaExceeded(err, file.name);
      const fallback = "Meta no aceptó el archivo y no se guardó nada. Vuelve a intentarlo; si se repite, prueba con otro.";
      setMediaStatus({ kind: "error", message: isHttpError(err) ? errorMessage(err, fallback) : fallback });
    }
  }

  function removeHeaderFile() {
    releaseLocal(headerFile);
    setHeaderFile(null);
    uploadTicket.current += 1;
    setMediaStatus({ kind: "idle" });
  }

  /** La siguiente versión libre que no sea la que acaba de chocar: la salida de un 409 en un clic. */
  function nextVersionAfterCurrent(): number {
    const free = options.find((option) => option.taken === null && option.version !== version);
    return free?.version ?? (version ?? 0) + 1;
  }

  /**
   * «Usar …» del aviso de un 409. Si el selector ya saltó solo (la versión que
   * falló quedó marcada como reservada o en uso), basta con aceptar la que está;
   * si no, se elige la siguiente libre.
   */
  function takeNextVersion() {
    if (name === failedName) setVersionChoice(nextVersionAfterCurrent());
    setFailure(null);
    goToStep("ficha");
  }

  async function refreshTemplates(): Promise<readonly HsmTemplateDTO[]> {
    const rows = await listHsmTemplates({ channel_id: channelId });
    setTemplates(rows);
    return rows;
  }

  /**
   * Sin respuesta, lo honesto es MIRAR antes de reenviar: si la plantilla ya
   * está en la lista, llegó; si no, se puede enviar.
   *
   * Se busca por el nombre que SE ENVIÓ, no por el de ahora: si llegó, su
   * versión aparece en uso al recargar y el selector salta solo a la siguiente,
   * y buscar esa diría «no llegó» de una que sí llegó (el incidente 2026-09-28).
   */
  async function checkArrived() {
    setChecking(true);
    try {
      const rows = await refreshTemplates();
      const arrived = !isEditing ? rows.find((row) => row.name === failedName && row.language === language) : undefined;
      if (arrived !== undefined) {
        showAlert({
          tone: "success",
          title: "Ya llegó a Meta",
          description: "Está en la lista, en revisión: no hace falta enviarla otra vez.",
        });
        onDirtyChange(false);
        onSaved(arrived);
        return;
      }
      setFailure(null);
      showAlert({ tone: "info", title: "No llegó: ya puedes enviarla" });
    } catch {
      // Seguimos sin saber: el aviso se queda y el botón sigue esperando.
      showAlert({ tone: "error", title: "Tampoco pudimos leer la lista. Inténtalo en un momento" });
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    setTouched(true);
    if (invalid) {
      // Se abre y se lleva al primer paso con error: un error plegado no se ve.
      const first = STEPS.find((step) => errorSteps.has(step.key));
      setOpenSteps((previous) => ({
        purpose: previous.purpose,
        message: previous.message || errorSteps.has("message"),
        ficha: previous.ficha || errorSteps.has("ficha"),
      }));
      if (first !== undefined) goToStep(first.key);
      return;
    }
    if (inFlight.current || failure?.kind === "unknown") return;
    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      const params = {
        body,
        ...(variableCount > 0 ? { examples: examples.slice(0, variableCount) } : {}),
        // Las rápidas se agrupan al guardar: intercaladas, Meta rechaza la
        // plantilla entera con «invalid combination».
        // Quitar una pieza NO es omitirla: editar reemplaza todos los
        // componentes en Meta, así que al editar se manda `null` explícito.
        // La excepción es una cabecera de MEDIA sin tocar: ahí se omite y el
        // servidor la conserva. Si cambió, viaja con su `header_media`.
        ...pieceUpdate("buttons", buttons.length === 0 ? null : groupButtons(buttons), isEditing),
        ...pieceUpdate("footer", footer, isEditing),
      };
      const headerFields = headerUpdate();
      const saved = isEditing
        ? await updateHsmTemplate(editing.id, {
            ...params,
            ...headerFields,
            // La categoría solo viaja si de verdad cambió Y Meta lo permite.
            ...(!categoryLocked && category !== editing.category ? { category } : {}),
          })
        : await createHsmTemplate({
            channel_id: channelId,
            name,
            language,
            category,
            ...params,
            // Sin tocar su texto fijo, se crea DESDE la biblioteca y Meta la
            // aprueba al instante; los botones solo aportan el enlace o el
            // teléfono del negocio. Tocada, viaja como propia.
            ...(libraryInstant && libraryOrigin !== null
              ? { library_template_name: libraryOrigin.name, category: "utility" as const }
              : {}),
            // Al crear no hay nada que quitar: `null` no viaja.
            ...(headerFields.header ? { header: headerFields.header } : {}),
            ...(headerFields.header_media ? { header_media: headerFields.header_media } : {}),
          });
      showAlert(
        saved.approval_status === "approved"
          ? { tone: "success", title: "Aprobada por Meta", description: "Es de su biblioteca: ya la puedes usar." }
          : {
              tone: "success",
              title: isEditing ? "Enviada de nuevo a revisión" : "Enviada a revisión de Meta",
              description:
                "Suele decidir en minutos; puede tardar hasta 48 h. Mientras haya alguna en revisión, la lista se refresca sola.",
            },
      );
      onDirtyChange(false);
      onSaved(saved);
    } catch (err) {
      const next = classifyHsmSubmitError(err);
      setFailedName(name);
      if (next.kind === "name_locked" && !isEditing && version !== null) {
        // Meta reserva esa versión 30 días: se anota para que el selector la
        // marque y proponga la siguiente libre.
        setReserved((previous) => {
          const key = `${base}|${language}`;
          const merged = new Map(previous);
          merged.set(key, new Map(previous.get(key) ?? []).set(version, next.until));
          return merged;
        });
      }
      setFailure(next);
      if (next.kind === "exists_here" || next.kind === "exists_meta" || next.kind === "unknown") {
        void refreshTemplates().catch(() => undefined);
      }
      if (next.kind === "rejected") {
        const step = HSM_REJECT_REASONS[next.reason].step;
        if (step !== null) goToStep(step);
      }
      if (next.kind === "name_locked") goToStep("ficha");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  // ── Estado de cada paso: la marca, los tramos de la isla y «Antes de enviar» ──
  const messageEmpty = body.trim() === "";
  const messageErrors = (["body", "examples", "header", "footer", "buttons"] as const).filter((field) => errors[field] !== undefined);
  const stepState: Record<HsmFormStep, FormStepState> = {
    purpose: "done",
    message: touched && messageErrors.length > 0 ? "error" : messageErrors.length === 0 ? "done" : "pending",
    ficha: touched && errors.name !== undefined ? "error" : errors.name === undefined ? "done" : "pending",
  };
  const progress: Record<HsmFormStep, StepProgressCheck["state"]> = {
    purpose: "ready",
    message: messageErrors.length === 0 ? "ready" : messageEmpty ? "pending" : "blocked",
    ficha: errors.name === undefined ? "ready" : base === "" ? "pending" : "blocked",
  };
  const readyCount = Object.values(progress).filter((state) => state === "ready").length;
  const dockChecks: StepProgressCheck[] = STEPS.map((step) => ({
    id: step.key,
    label: step.title,
    state: progress[step.key],
    onGo: () => goToStep(step.key),
  }));
  const notStarted = messageEmpty && base === "";
  const dockTitle = readyCount === STEPS.length ? "Lista" : notStarted ? "Por empezar" : "Casi lista";
  const dockDetail = whatIsMissing(errors, {
    messageEmpty,
    baseEmpty: base === "",
    missingExample,
    isEditing,
    mediaWithoutCopy,
    libraryInstant,
  });

  const summaries: Record<HsmFormStep, string> = {
    purpose: `${categoryLabel} · ${priceLabel(category)} por mensaje`,
    message:
      messageErrors.length > 0 && touched
        ? "Hay algo que corregir"
        : messageEmpty
          ? "Sin escribir"
          : [
              header !== null ? "cabecera" : mediaKind !== null ? HEADER_KIND_LABEL[mediaKind] : null,
              `${String(variableCount)} ${variableCount === 1 ? "variable" : "variables"}`,
              footer !== null ? "pie" : null,
              buttons.length > 0 ? `${String(buttons.length)} ${buttons.length === 1 ? "botón" : "botones"}` : null,
            ]
              .filter((piece): piece is string => piece !== null)
              .join(" · "),
    ficha: name === "" ? "Sin nombre" : `${name} · ${LANGUAGES.find((item) => item.value === language)?.label ?? language}${isEditing ? " · fijos" : ""}`,
  };

  const previewProps = {
    header,
    media:
      mediaKind === null
        ? null
        : {
            kind: mediaKind,
            url:
              mediaStatus.kind === "uploading" && mediaStatus.localUrl !== null
                ? mediaStatus.localUrl
                : (headerFile?.local_url ?? headerFile?.preview_url ?? null),
            fileName: headerFile?.file_name,
          },
    body,
    examples,
    footer,
    buttons,
  };
  const rejectionReason = isFixing ? rejectionReasonLabel(editing.rejected_reason) : null;
  const bodyChanged = isEditing && body !== editing.body;
  const counter = `${String(variableCount)} ${variableCount === 1 ? "variable" : "variables"} · ${String(body.length)} / ${String(BODY_MAX)}`;

  return {
    isEditing,
    isFixing,
    nameRef,
    human,
    setHuman,
    setVersionChoice,
    language,
    setLanguage,
    category,
    setCategory,
    body,
    setBody,
    examples,
    setExamples,
    headerKind,
    setHeaderText,
    headerFile,
    mediaStatus,
    footer,
    setFooter,
    buttons,
    setButtons,
    origin,
    libraryOrigin,
    library,
    libraryInstant,
    libraryChanged,
    startCollapsed,
    setStartCollapsed,
    submitting,
    touched,
    failure,
    setFailure,
    failedName,
    checking,
    openSteps,
    setOpenSteps,
    base,
    options,
    version,
    name,
    variableCount,
    categoryLocked,
    header,
    mediaKind,
    mediaWithoutCopy,
    errors,
    invalid,
    missingExample,
    goToStep,
    applySuggestion,
    applyLibrary,
    retryLibrary,
    startBlank,
    insertVariable,
    changeHeaderKind,
    pickHeaderFile,
    removeHeaderFile,
    nextVersionAfterCurrent,
    takeNextVersion,
    checkArrived,
    submit,
    messageEmpty,
    stepState,
    dockChecks,
    dockTitle,
    dockDetail,
    summaries,
    rejectionReason,
    bodyChanged,
    counter,
    previewProps,
  };
}
