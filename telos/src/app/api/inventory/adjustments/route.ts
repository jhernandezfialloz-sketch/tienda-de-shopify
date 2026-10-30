import { api, body } from "@/server/api";
import { adjustStock } from "@/server/services/inventory";
import { parse } from "@/server/validation/common";
import { adjustmentInput } from "@/server/validation/schemas";

export const POST = api(async ({ req, user }) => adjustStock(user, parse(adjustmentInput, await body(req))));
