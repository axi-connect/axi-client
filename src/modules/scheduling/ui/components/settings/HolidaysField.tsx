"use client";

import { useEffect, useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { fmtDayShort } from "@/core/lib/business-time";
import {
  HOLIDAY_COUNTRIES,
  type ClosureDayDTO,
} from "@/modules/scheduling/domain/schedule-exceptions";
import { getClosures } from "@/modules/scheduling/infrastructure/services/schedule-calendar-service.adapter";
import type { SettingsFormValues } from "../../forms/config/settings.config";

const NEXT_HOLIDAYS = 5;

/**
 * «No atiende en festivos de {país}» (S-05). Apagado por defecto; el país es
 * el de la empresa salvo que se elija otro con calendario. Los próximos
 * festivos los calcula el servidor (`/scheduling/closures`): el cliente no
 * repite la regla.
 */
export function HolidaysField({
  control,
  closes,
  disabled,
  onClosesChange,
  onCountryChange,
}: {
  control: Control<SettingsFormValues>;
  closes: boolean;
  disabled: boolean;
  onClosesChange: (next: boolean) => void;
  onCountryChange: (code: string) => void;
}) {
  const country = useWatch({ control, name: "holiday_country" });
  const [holidays, setHolidays] = useState<ClosureDayDTO[] | null>(null);

  useEffect(() => {
    let alive = true;
    getClosures()
      .then((data) => {
        if (alive) setHolidays(data.days.filter((day) => day.is_holiday).slice(0, NEXT_HOLIDAYS));
      })
      .catch(() => {
        // Informativo: sin la lista el interruptor sigue funcionando
        if (alive) setHolidays([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const countryCode = country ?? HOLIDAY_COUNTRIES[0]?.code ?? "CO";

  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-accent-amber/5 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm font-semibold">
          <span id="holidays-label">No atiende en festivos de</span>
          <Select
            value={countryCode}
            onValueChange={onCountryChange}
            disabled={disabled || HOLIDAY_COUNTRIES.length < 2}
          >
            <SelectTrigger size="sm" className="h-7 w-auto gap-1 px-2 font-semibold" aria-label="País de los festivos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLIDAY_COUNTRIES.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Por defecto, el país de tu empresa. Los festivos se calculan solos cada año (en Colombia: Ley
          Emiliani, Semana Santa y Ley 2578 de 2026). Apagado, se atiende con el horario de siempre. Para
          abrir un festivo puntual, agrégalo como día especial.
        </p>
        {holidays !== null && holidays.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Próximos festivos">
            {holidays.map((day) => (
              <li
                key={day.date}
                className="max-w-full rounded-full border border-accent-amber/45 bg-accent-amber/10 px-2 py-0.5 text-[11px] [overflow-wrap:anywhere]"
              >
                {fmtDayShort(day.date)}
                {day.holiday_name !== null && ` · ${day.holiday_name}`}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Switch
        size="lg"
        checked={closes}
        onCheckedChange={onClosesChange}
        disabled={disabled}
        aria-labelledby="holidays-label"
      />
    </div>
  );
}
