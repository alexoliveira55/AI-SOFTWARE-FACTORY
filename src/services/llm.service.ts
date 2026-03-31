export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
}

export async function callLLM(request: LLMRequest): Promise<LLMResponse> {
  // mock por enquanto
}