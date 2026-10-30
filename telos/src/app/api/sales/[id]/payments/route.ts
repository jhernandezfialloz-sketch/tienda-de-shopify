import { api, body } from "@/server/api";
import { recordPayment } from "@/server/services/sales";

export const POST = api<{ id: string }>(async ({ req, user, params }) => recordPayment(user, params.id, await body(req)));
