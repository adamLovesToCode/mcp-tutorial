import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";

const server = new McpServer({
  name: "test",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

server.tool(
  "create-user", // this is the name that the ai is going to see
  "Create a new user in the database", // Description for the ai to see what the tool does
  {
    // fields that are necessary to create the user ie payload
    name: z.string(),
    email: z.string(),
    address: z.string(),
    phone: z.string(),
  },
  {
    // Annotations
    // Hints for the ai to know what it can do and what it can not do
    title: "Create user",
    readOnlyHint: false,
    destructiveHint: false, // this does not delete any data
    idempotentHint: false, // if i run this multiple times, does this have any side-effects? -> if we run this multiple times, we create multiple users..
    openWorldHint: true, // we interact with a fake database, that is outside of our application
  },
  async (params) => {
    // params of type of name,email,address,phone
    try {
      const id = await createUser(params);
      return {
        content: [
          {
            type: "text",
            text: `User with ${id} crated successfully`,
          },
        ],
      };
    } catch {
      // specific to usual ai reponse..
      return {
        content: [
          {
            type: "text",
            text: "Failed to save user",
          },
        ],
      };
    }
  }
);

function createUser(user: {
  name: string;
  email: string;
  phone: string;
  address: string;
}) {
  const users = await import("./data/users.json");
}

async function main() {
  const transport = new StdioServerTransport(); // like console.log -> local
  await server.connect(transport);
}

main();
