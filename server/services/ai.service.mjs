import OpenAI from "openai";
import { AILogModel } from "../models/ai/index.mjs";
import * as leaveService from "./leave.service.mjs";
import { AppError } from "../utils/errors.mjs";
import { formatDate } from "../src/rules/time.mjs";

let customClient = null;

export const setOpenAIClient = (client) => {
  customClient = client;
};

export const getOpenAIClient = () => {
  if (customClient) return customClient;
  return new OpenAI({
    apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "dummy_api_key",
    baseURL: process.env.AI_BASE_URL || process.env.OPENAI_BASE_URL || undefined,
  });
};

export const aiTools = [
  {
    type: "function",
    function: {
      name: "check_my_leave_balance",
      description: "Check the employee's current leave balances, approved days, and pending days.",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "number",
            description: "Calendar year (defaults to current year)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_for_leave",
      description: "Submit a new leave application for the employee.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["annual", "sick", "casual", "unpaid"],
            description: "Leave type key",
          },
          startDate: {
            type: "string",
            description: "Start date in YYYY-MM-DD format",
          },
          endDate: {
            type: "string",
            description: "End date in YYYY-MM-DD format",
          },
          reason: {
            type: "string",
            description: "Reason for the leave",
          },
        },
        required: ["type", "startDate", "endDate", "reason"],
      },
    },
  },
];

/**
 * Processes an AI chat prompt, enforcing a 15-second network timeout,
 * executing any invoked tools (leave balance or leave application),
 * and logging the prompt/response to AILogModel.
 */
export const processChat = async ({ companyId = null, userId, role, employeeId, message }) => {
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new AppError(400, "VALIDATION_ERROR", "Field 'message' is required");
  }

  const promptText = message.trim();
  const todayStr = formatDate(new Date());

  const messages = [
    {
      role: "system",
      content: `You are the HCM Lite AI Assistant. Today is ${todayStr}.
You help employees manage their leave and queries.
When asked about remaining leave or balances, call 'check_my_leave_balance'.
When asked to apply for leave, extract type, startDate, endDate, and reason, and call 'apply_for_leave'.
Provide concise and helpful responses.`,
    },
    {
      role: "user",
      content: promptText,
    },
  ];

  const client = getOpenAIClient();
  const toolsUsed = [];
  let totalTokens = 0;
  let finalResponse = "";

  try {
    const initialCompletion = await client.chat.completions.create(
      {
        model: process.env.AI_MODEL || "gpt-3.5-turbo",
        messages,
        tools: aiTools,
        tool_choice: "auto",
      },
      { signal: AbortSignal.timeout(15000) },
    );

    const initialChoice = initialCompletion.choices?.[0];
    const initialMessage = initialChoice?.message;
    totalTokens += initialCompletion.usage?.total_tokens || 0;
    finalResponse = initialMessage?.content || "";

    if (initialMessage?.tool_calls && initialMessage.tool_calls.length > 0) {
      messages.push(initialMessage);

      for (const toolCall of initialMessage.tool_calls) {
        const toolName = toolCall.function.name;
        toolsUsed.push(toolName);

        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          args = {};
        }

        let toolResult;
        const userObj = { _id: userId, id: userId, role, employeeId, companyId };

        try {
          if (toolName === "check_my_leave_balance") {
            if (!employeeId) {
              toolResult = { error: "No employee profile associated with this account" };
            } else {
              toolResult = await leaveService.getBalance(userObj, args.year);
            }
          } else if (toolName === "apply_for_leave") {
            if (!employeeId) {
              toolResult = { error: "No employee profile associated with this account" };
            } else {
              const leave = await leaveService.applyLeave(userObj, {
                type: args.type,
                startDate: args.startDate,
                endDate: args.endDate,
                reason: args.reason,
              });
              toolResult = {
                success: true,
                leaveId: leave._id,
                type: leave.type,
                startDate: leave.startDate,
                endDate: leave.endDate,
                days: leave.days,
                status: leave.status,
              };
            }
          } else {
            toolResult = { error: `Unsupported tool: ${toolName}` };
          }
        } catch (err) {
          toolResult = {
            error: err.message,
            code: err.code || "TOOL_EXECUTION_ERROR",
          };
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      const followUpCompletion = await client.chat.completions.create(
        {
          model: process.env.AI_MODEL || "gpt-3.5-turbo",
          messages,
        },
        { signal: AbortSignal.timeout(15000) },
      );

      finalResponse = followUpCompletion.choices?.[0]?.message?.content || finalResponse;
      totalTokens += followUpCompletion.usage?.total_tokens || 0;
    }
  } catch (err) {
    if (
      err.name === "AbortError" ||
      err.code === "ABORT_ERR" ||
      err.message?.toLowerCase().includes("timeout") ||
      err.message?.toLowerCase().includes("abort")
    ) {
      throw new AppError(
        504,
        "AI_GATEWAY_TIMEOUT",
        "AI service request timed out after 15 seconds",
      );
    }
    throw err;
  }

  const aiLog = await AILogModel.create({
    ...(companyId ? { companyId } : {}),
    userId: userId || null,
    prompt: promptText,
    response: finalResponse,
    toolsUsed,
    tokens: totalTokens,
  });

  return {
    response: finalResponse,
    message: finalResponse,
    toolsUsed,
    tokens: totalTokens,
    logId: aiLog._id,
  };
};
