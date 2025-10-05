import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import z from "zod";
import fs from "node:fs/promises";

const server = new McpServer({
  name: "test",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

server.prompt(
  "Generate-fake-user",
  "Generate a fake user based on a given name",
  {
    name: z.string(),
  },
  (name) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Generate a fake user with the name ${name.name}. Provide the response in JSON format with the following fields: name, email, address, phone.`,
          },
        },
      ],
    };
  }
);

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
    } catch (e) {
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

server.resource(
  "users",
  "users://all",
  {
    description: "Get all users from the database",
    title: "Get all users",
    mimeType: "application/json",
  },
  async (uri) => {
    const usersData = await fs.readFile("./src/data/users.json", "utf-8");
    const users = JSON.parse(usersData);
    return {
      contents: [
        {
          uri: uri.href, // what is the uri of the resource
          text: JSON.stringify(users, null, 2), // text content of the resource
          mimeType: "application/json", // mime type of the resource
        },
      ],
    };
  }
);

server.resource(
  "user-details",
  new ResourceTemplate("users://{userId}/profile", {
    list: undefined, // lets the ai discover what specific resources are availabl || tells the ai what users are availalbe
    //  So setting it to undefined is saying "this dynamic resource exists at users://{userId}/profile, but don't auto-discover all user
    //   IDs - just use it when you know the ID."
  }),
  // "users://{userId}/profile",
  // {
  //   list:undefined,
  // }
  {
    description: "Get user details from the database",
    title: "User Details",
    mimeType: "application/json",
  },
  async (uri, { userId }) => {
    const usersData = await fs.readFile("./src/data/users.json", "utf-8");
    const users = JSON.parse(usersData);

    const user = users.find((u: any) => u.id === parseInt(userId as string));

    if (!user) {
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify({ error: "User not found" }, null, 2),
            mimeType: "application/json",
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: uri.href, // what is the uri of the resource
          text: JSON.stringify(user, null, 2), // text content of the resource
          mimeType: "application/json", // mime type of the resource
        },
      ],
    };
  }
);

async function createUser(user: {
  name: string;
  email: string;
  phone: string;
  address: string;
}) {
  const usersData = await fs.readFile("./src/data/users.json", "utf-8");
  const users = JSON.parse(usersData);
  const id = users.length + 1;
  users.push({ id, ...user });

  await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2));

  return id;
}

async function main() {
  const transport = new StdioServerTransport(); // like console.log -> local
  await server.connect(transport);
}

main();
