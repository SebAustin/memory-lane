# Call the Qloo REST API directly, not through the hackathon MCP server

The hackathon kit ships `qloo mcp`, but it only runs as a local stdio server, and the kit itself says serverless hosting isn't a supported route. Our demo must be hosted on Vercel, so we call `https://hackathon.api.qloo.com` directly through a typed `QlooClient` module, sending the `X-Api-Key` header from the server side. We copy the kit's result-envelope idea (`ok | empty | needs_input | partial | degraded | error` plus provenance) so our agent tools behave like the official ones.
