import { z } from "zod";
import { api, body } from "@/server/api";
import { transitionSale } from "@/server/services/sales";
import { parse } from "@/server/validation/common";

const input = z.object({ to: z.enum(["CONFIRMADA", "ENTREGADA", "CANCELADA", "DEVUELTA"]), reason: z.string().max(300).optional() });

export const POST = api<{ id: string }>(async ({ req, user, params }) => {
  const { to, reason } = parse(input, await body(req));
  return transitionSale(user, params.id, to, reason);
});
