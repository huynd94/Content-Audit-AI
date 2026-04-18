import OpenAI from "openai";
import { openAIClientConfig } from "./config";

export const openai = new OpenAI({
  ...openAIClientConfig,
});
