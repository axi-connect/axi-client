"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { isImportDone, type ImportJobDTO } from "@/modules/crm/domain/import";
import { getImport } from "@/modules/crm/infrastructure/services/imports-service.adapter";

export const IMPORT_POLL_MS = 2000;

/**
 * Sigue un job de import hasta su estado terminal: polling cada 2 s como
 * backstop y el evento WS `crm.import_completed` como atajo. `onDone` se
 * dispara UNA vez con el job terminal (completed o failed).
 */
export function useImportJob(onDone?: (job: ImportJobDTO) => void) {
  const [job, setJob] = useState<ImportJobDTO | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const { socket } = useSocket("inbox");

  const settle = useCallback((fresh: ImportJobDTO) => {
    setJob((previous) => {
      const wasDone = previous !== null && isImportDone(previous.status);
      if (!wasDone && isImportDone(fresh.status)) onDoneRef.current?.(fresh);
      return fresh;
    });
  }, []);

  const refetch = useCallback(
    (id: string) => getImport(id).then(settle).catch(() => undefined),
    [settle],
  );

  const jobId = job?.id;
  const done = job === null || isImportDone(job.status);
  useEffect(() => {
    if (jobId === undefined || done) return;
    const timer = setInterval(() => void refetch(jobId), IMPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [jobId, done, refetch]);

  useSocketEvent(socket, "crm.import_completed", (event) => {
    if (jobId !== undefined && event.import_job_id === jobId) void refetch(jobId);
  });

  const start = useCallback((created: ImportJobDTO) => settle(created), [settle]);
  const reset = useCallback(() => setJob(null), []);

  return { job, start, reset };
}
