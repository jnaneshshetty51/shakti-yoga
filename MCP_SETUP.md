# Hostinger MCP Server Setup

This guide explains how to configure the Hostinger MCP (Model Context Protocol) server for managing your Hostinger VPS through Cursor.

## What is MCP?

MCP (Model Context Protocol) allows AI assistants in Cursor to interact with external services, in this case, your Hostinger VPS management API.

## Configuration Location

MCP server configurations are stored in Cursor's settings file, not in your project. The location depends on your operating system:

### macOS
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

### Windows
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

### Linux
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

## Setup Instructions

### Step 1: Get Your Hostinger API Token

1. Log in to your Hostinger account
2. Go to API settings or Developer section
3. Generate a new API token
4. Copy the token (you'll need it in Step 3)

### Step 2: Open MCP Settings File

1. Open Cursor
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Preferences: Open User Settings (JSON)"
4. Navigate to the MCP settings file location above

OR

1. Open the file directly in Cursor using the path above

### Step 3: Add Hostinger MCP Configuration

Add this configuration to your MCP settings file:

```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": [
        "hostinger-api-mcp@latest"
      ],
      "env": {
        "API_TOKEN": "YOUR_HOSTINGER_API_TOKEN_HERE"
      }
    }
  }
}
```

**Important:** Replace `YOUR_HOSTINGER_API_TOKEN_HERE` with your actual Hostinger API token.

### Step 4: Restart Cursor

After adding the configuration, restart Cursor to load the MCP server.

## Verification

After setup, you should be able to:
- Ask Cursor to manage your Hostinger VPS
- Deploy applications through the MCP interface
- Monitor server status
- Manage DNS settings
- And more Hostinger API operations

## Example Usage

Once configured, you can ask Cursor things like:
- "Check the status of my Hostinger VPS"
- "Deploy the application to Hostinger"
- "Show me my server details"
- "Create a new DNS record"

## Troubleshooting

### MCP Server Not Loading
1. Verify the JSON syntax is correct (no trailing commas)
2. Check that `npx` is available in your PATH
3. Ensure your API token is correct
4. Check Cursor's developer console for errors

### API Token Issues
- Make sure your token has the necessary permissions
- Verify the token hasn't expired
- Check Hostinger's API documentation for token requirements

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit API tokens** - The MCP settings file should not be in your project
2. **Use environment variables** - Consider using environment variables for tokens
3. **Rotate tokens regularly** - Change your API tokens periodically
4. **Limit permissions** - Only grant necessary permissions to your API token

## Additional Resources

- [Hostinger API Documentation](https://www.hostinger.com/api)
- [MCP Protocol Documentation](https://modelcontextprotocol.io)
- [Cursor MCP Settings](https://cursor.sh/docs/mcp)

## Quick Reference

**Configuration Template:**
```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": ["hostinger-api-mcp@latest"],
      "env": {
        "API_TOKEN": "ENTER_TOKEN_HERE"
      }
    }
  }
}
```

Replace `ENTER_TOKEN_HERE` with your actual Hostinger API token.

