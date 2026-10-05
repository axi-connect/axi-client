/**
 * Kit de asistente conversacional — avatar, escenario, la isla (dock), hilo,
 * burbujas, pregunta, pensando, markdown, compositor y píldoras.
 *
 * Presentacional puro: no importa de `modules/`. Cada slice (cmo con Axel,
 * intake con Alba) aporta su store, su copy y su personaje, y compone estas
 * piezas. El campo de fondo es la clase `.assistant-field` de `globals.css`,
 * que va en el `<main>` de cada vista.
 */
export type {
  AssistantActivityChip,
  AssistantIslandAction,
  AssistantIslandDatum,
  AssistantIslandGlow,
  AssistantIslandHighlight,
  AssistantIslandItem,
  AssistantIslandListeningState,
  AssistantIslandNotice,
  AssistantIslandQuestion,
  AssistantIslandSummary,
  AssistantLiveStep,
  AssistantQuestionData,
  AssistantQuestionLabels,
  AssistantQuestionOption,
  AssistantStarter,
} from "./types";

export { AssistantAvatar, type AssistantAvatarProps } from "./avatar/AssistantAvatar";
export { AssistantStage } from "./avatar/AssistantStage";
export { AssistantIslandStage, type AssistantIslandTone } from "./avatar/AssistantIslandStage";
export {
  ASSISTANT_AVATAR_COLORS,
  ASSISTANT_CHARACTERS,
  AVATAR_EYE_CY,
  AVATAR_LIP_Y,
  CHARACTER_GEOMETRY,
  isAssistantAvatarColor,
  isAssistantCharacter,
  mouthOpenCy,
  mouthPath,
  type AssistantAvatarColor,
  type AssistantCharacter,
  type BodyShape,
  type CharacterGeometry,
} from "./avatar/avatar-characters";
export { AssistantHeroAvatar } from "./avatar/AssistantHeroAvatar";
export { AssistantDock, islandShape, useTodayLabel, type AssistantIslandShape } from "./avatar/AssistantDock";
export {
  ASSISTANT_ACCESSORIES,
  ASSISTANT_EXPRESSION_NAMES,
  ASSISTANT_EXPRESSIONS,
  AVATAR_BLINK,
  AVATAR_SACCADE,
  isAssistantAccessory,
  nextBlinkDelayMs,
  nextSaccade,
  resolvePoseStyle,
  type AssistantAccessory,
  type AssistantExpressionName,
  type AvatarEase,
  type AvatarExpression,
  type AvatarEyeState,
  type AvatarPoseOptions,
  type AvatarPoseStyle,
} from "./avatar/avatar-rig";
export {
  canGreet,
  gazeAllowed,
  GESTURE_MS,
  gestureForTap,
  isLiveMood,
  MOOD_EXPRESSION,
  PROUD_MS,
  resolveAssistantMood,
  TAP_COOLDOWN_MS,
  TAP_WINDOW_MS,
  type AssistantGesture,
  type AssistantMood,
  type AssistantMoodInput,
} from "./avatar/avatar-mood";

export { AssistantMark } from "./chat/AssistantMark";
export { AssistantBubble } from "./chat/AssistantBubble";
export { UserBubble } from "./chat/UserBubble";
export { SystemNote } from "./chat/SystemNote";
export { AssistantQuestion } from "./chat/AssistantQuestion";
export { AssistantThinking } from "./chat/AssistantThinking";
export { AssistantIslandActivity } from "./chat/AssistantIslandActivity";
export { AssistantIslandPanel } from "./chat/AssistantIslandPanel";
export { AssistantIslandListening } from "./chat/AssistantIslandListening";
export { AssistantListenButton } from "./chat/AssistantListenButton";
export { AssistantMarkdown } from "./chat/AssistantMarkdown";
export {
  AssistantComposer,
  COMPOSER_MAX_PX,
  VOICE_PROBLEM_COPY,
  type AssistantComposerVoice,
} from "./chat/AssistantComposer";
export type { RecorderProblem } from "@/core/hooks/use-voice-recorder";
export { StarterPills } from "./chat/StarterPills";

export { AssistantChatShell } from "./shell/AssistantChatShell";

export { useAssistantMood, type AssistantMoodState } from "./hooks/use-assistant-mood";
export { useAvatarGaze } from "./hooks/use-avatar-gaze";
export { useAvatarLife } from "./hooks/use-avatar-life";
export { useStoredAccessory, type StoredAccessoryOptions } from "./hooks/use-stored-accessory";
export { useComposerFlip } from "./shell/use-composer-flip";
export { ISLAND_NOTICE_MS, useIslandQueue, type IslandQueue } from "./hooks/use-island-queue";
export { useInView } from "./hooks/use-in-view";
export { parseAssistantText, parseInline, type Block, type ListItem, type Span } from "./chat/markdown";
