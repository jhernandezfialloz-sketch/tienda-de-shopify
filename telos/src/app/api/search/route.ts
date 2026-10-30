import { api, query } from "@/server/api";
import { globalSearch } from "@/server/services/search";

export const GET = api(async ({ req }) => globalSearch(query(req).q ?? ""));
