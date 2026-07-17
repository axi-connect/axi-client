/**
 * Schema del form de conexión de la DB dedicada. Regex y rangos del backend
 * impuestos en cliente (spec §3.4). `password` vacía = conservar la actual;
 * con valor = ROTACIÓN de credencial.
 */
import { z } from "zod";
import { DB_IDENTIFIER_REGEX, type UpsertTenantDatabaseDTO } from "../../../../../domain/database";

export const databaseConnectionSchema = z.object({
  host: z.string().min(1, "Ingresa el host"),
  port: z.coerce.number().int("Puerto inválido").min(1, "Puerto inválido").max(65535, "Puerto inválido"),
  database_name: z
    .string()
    .regex(DB_IDENTIFIER_REGEX, "Minúsculas, números, _ y $; empieza por letra o _"),
  username: z
    .string()
    .regex(DB_IDENTIFIER_REGEX, "Minúsculas, números, _ y $; empieza por letra o _"),
  ssl_mode: z.enum(["disable", "require", "verify_full"]),
  pool_max: z.coerce.number().int().min(1, "Entre 1 y 50").max(50, "Entre 1 y 50"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(256, "Máximo 256 caracteres")
    .optional()
    .or(z.literal("")),
});

export type DatabaseConnectionValues = z.infer<typeof databaseConnectionSchema>;

export const defaultDatabaseConnectionValues: DatabaseConnectionValues = {
  host: "",
  port: 5432,
  database_name: "",
  username: "",
  ssl_mode: "require",
  pool_max: 10,
  password: "",
};

/** Mapea a wire: la password solo viaja si se escribió (vacía = conservar). */
export function toUpsertDatabaseDTO(values: DatabaseConnectionValues): UpsertTenantDatabaseDTO {
  return {
    host: values.host,
    port: values.port,
    database_name: values.database_name,
    username: values.username,
    ssl_mode: values.ssl_mode,
    pool_max: values.pool_max,
    ...(values.password ? { password: values.password } : {}),
  };
}
