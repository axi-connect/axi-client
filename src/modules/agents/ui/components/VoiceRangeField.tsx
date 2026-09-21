"use client";

/**
 * Range nativo controlado (patrón del repo: AudioPlayerCore / EvaluationActions)
 * para los tres ajustes de la voz. Antes vivía atado a RHF dentro de
 * `CharacterForm`; ahora es genérico y quien lo usa decide el estado.
 */
export function VoiceRangeField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  format = (v) => v.toFixed(2),
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  format?: (value: number) => string;
}) {
  return (
    <label className="grid grid-cols-[88px_1fr_44px] items-center gap-3 text-xs">
      <span className="font-normal">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-brand disabled:cursor-not-allowed"
        aria-label={label}
        aria-valuetext={format(value)}
      />
      <span className="text-right tabular-nums text-muted-foreground">{format(value)}</span>
    </label>
  );
}
