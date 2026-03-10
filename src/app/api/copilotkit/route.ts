import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

export const maxDuration = 60;

export const POST = async (req: Request) => {
  const runtime = new CopilotRuntime();

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new OpenAIAdapter({ model: "gpt-4o" }),
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
