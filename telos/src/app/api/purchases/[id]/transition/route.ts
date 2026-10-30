import { z } from "zod";
import { api, body } from "@/server/api";
import { transitionPurchase } from "@/server/services/purchases";
import { parse } from "@/server/validation/common";

const input = z.object({ to: z.enum(["ORDENADA", "ENVIADA", "RECIBIDA", "CANCELADA"]) });

export const POST = api<{ id: string }>(async ({ req, user, params }) => transitionPurchase(user, params.id, parse(input, await body(req)).to));
