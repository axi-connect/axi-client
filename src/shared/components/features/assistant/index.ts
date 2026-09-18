/**
 * Kit de asistente conversacional — avatar, escenario, dock, hilo, burbujas,
 * pregunta, pensando, markdown, compositor y píldoras.
 *
 * Presentacional puro: no importa de `modules/`. Cada slice (cmo con Axel,
 * intake con Alba) aporta su store, su copy y su personaje, y compone estas
 * piezas. El campo de fondo es la clase `.assistant-field` de `globals.css`,
 * que va en el `<main>` de cada vista.
 */
export type {
  AssistantLiveStep,
  AssistantQuestionData,
  AssistantQuestionLabels,
  AssistantQuestionOption,
  AssistantStarter,
} from "./types";

export { AssistantAvatar, type AssistantAvatarProps } from "./avatar/AssistantAvatar";
export { AssistantStage } from "./avatar/AssistantStage";
export { AssistantHeroAvatar } from "./avatar/AssistantHeroAvatar";
export { AssistantDock, useTodayLabel } from "./avatar/AssistantDock";
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
export { AssistantMarkdown } from "./chat/AssistantMarkdown";
export { AssistantComposer, COMPOSER_MAX_PX, type AssistantComposerVoice } from "./chat/AssistantComposer";
export { StarterPills } from "./chat/StarterPills";

export { AssistantChatShell } from "./shell/AssistantChatShell";

export { useAssistantMood, type AssistantMoodState } from "./hooks/use-assistant-mood";
export { useAvatarGaze } from "./hooks/use-avatar-gaze";
export { useAvatarLife } from "./hooks/use-avatar-life";
export { useDockedHero, DOCK_HEIGHT_PX } from "./hooks/use-docked-hero";
export { useStoredAccessory, type StoredAccessoryOptions } from "./hooks/use-stored-accessory";
export { useComposerFlip } from "./shell/use-composer-flip";
export { parseAssistantText, parseInline, type Block, type ListItem, type Span } from "./chat/markdown";
