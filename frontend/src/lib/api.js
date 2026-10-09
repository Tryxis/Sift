import { httpApi } from "./httpApi";
import { mockApi } from "./mockApi";

export const USING_MOCK_API = import.meta.env.VITE_USE_MOCK === "true";

export const api = USING_MOCK_API ? mockApi : httpApi;
