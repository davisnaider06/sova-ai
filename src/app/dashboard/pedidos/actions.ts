"use server";

import { revalidatePath } from "next/cache";
import { requireSellerScope } from "@/lib/session";
import { importOrdersCsv } from "@/lib/integration/orders-import";
import type { ImportState } from "@/lib/integration/orders-contract";
import { DEFAULT_ATTRIBUTION_WINDOW_DAYS } from "@/lib/attribution";

const MAX_BYTES = 6 * 1024 * 1024;

export async function importOrders(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { scope, common } = await requireSellerScope();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Escolha um arquivo CSV." };
  }
  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: "Arquivo acima de 6 MB. Divida a exportação em períodos menores.",
    };
  }

  const rawWindow = Number(formData.get("windowDays"));
  const windowDays =
    Number.isInteger(rawWindow) && rawWindow > 0 && rawWindow <= 90
      ? rawWindow
      : DEFAULT_ATTRIBUTION_WINDOW_DAYS;

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: "error", message: "Não consegui ler o arquivo." };
  }

  const report = await importOrdersCsv(scope.sellerProfileId, text, { windowDays });

  await common.events.record("ORDERS_IMPORTED", {
    metadata: {
      fileName: file.name,
      ordersCreated: report.ordersCreated,
      ordersSkipped: report.ordersSkipped,
      errors: report.errors.length,
      windowDays,
    },
  });

  revalidatePath("/dashboard/pedidos");
  revalidatePath("/dashboard");

  return { status: "done", report };
}
