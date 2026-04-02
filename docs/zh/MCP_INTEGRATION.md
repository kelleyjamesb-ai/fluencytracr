# 🔌 MCP 集成指南

## 🌐 什么是 MCP？

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 是连接 AI 应用与外部工具/数据源的标准协议。启用后可以：
- 🔗 同时连接多个 MCP 服务器并使用其中的工具  
- 📊 访问数据库、API、文件系统、浏览器等  
- 🔄 将远端工具与本地工具透明合并  

## 🚀 快速配置

1) `.env` 启用 MCP  
```bash
MCP_ENABLED=true
```

2) 编辑 `mcp_servers.json`  
```json
{
  "servers": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "enabled": true,
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    },
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "enabled": true
    }
  ]
}
```

3) 运行 Agent  
```bash
python src/agent.py
```
Agent 会连接已启用的服务器、发现工具并与本地工具合并。

## 🏗️ 架构
Agent → MCP 客户端管理器 → 多个 MCP 服务器；本地工具与远端工具合并成统一工具集对外使用。

## 📡 支持的传输

| transport | 适用场景 |
|-----------|----------|
| `stdio`   | 本地/CLI 服务器 |
| `http`    | 远端/云端服务 |
| `sse`     | 兼容 SSE 的 HTTP 服务器 |

## 🛠️ 内置 MCP 辅助工具

- `list_mcp_servers()` — 列出连接的服务器  
- `list_mcp_tools()` — 枚举所有可用 MCP 工具  
- `get_mcp_tool_help(name)` — 查看工具帮助  
- `mcp_health_check()` — 服务器健康检查  

## 📋 预置模板

`mcp_servers.json` 已包含文件系统、GitHub、PostgreSQL、Brave Search、Memory、Puppeteer、Slack 等模板，按需启用并填好密钥即可。

## 🔧 自定义 MCP 服务器

使用 [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) 与 FastMCP：
```python
from mcp.server.fastmcp import FastMCP
from typing import Dict, Any

mcp = FastMCP("My Analysis Server")

@mcp.tool()
def validate_event_metadata(event: Dict[str, Any]) -> Dict[str, Any]:
    """仅校验元数据事件信封。"""
    required = {"event_type", "timestamp", "risk_class", "workflow_id"}
    missing = [k for k in required if k not in event]
    return {"valid": len(missing) == 0, "missing": missing}

if __name__ == "__main__":
    mcp.run()
```
然后在 `mcp_servers.json` 注册：
```json
{
  "name": "my-analysis",
  "transport": "stdio",
  "command": "python",
  "args": ["src/tools/my_server.py"],
  "enabled": true
}
```
重启 Agent 即可使用。

## FluencyTracr MCP Adapter Server

参考文档:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` 合同: `docs/api/ingest.md`
- MCP 服务器架构: `docs/mcp/fluencytracr-mcp-server.md`

工具列表:
- `fluency.ingest_events` 将元数据/事件信封转发到 `/api/ingest`
- `fluency.get_evidence_bundle`
- `fluency.get_control_evidence`
- `fluency.get_coverage_map`

工具输入约束:
- 仅允许枚举值和有界字段
- 拒绝自由文本内容字段
- 窗口枚举仅允许: `daily`, `weekly`, `30d`, `60d`, `90d`, `180d`, `360d`, `3m`, `6m`, `12m`- `risk_class`、`workflow_category`、`tool_class` 必须是受限枚举

鉴权与范围:
- 仅允许服务身份令牌
- 每次调用必须绑定 `org_id` 范围
- 适配器层拒绝跨组织访问

速率限制与幂等:
- `fluency.ingest_events` 必须包含 `Idempotency-Key`
- ingest 请求必须携带 `X-FluencyTracr-Schema-Version`
- 对 `429` 使用有界指数退避
- 保持幂等重试语义

显式禁止内容示例:
- Prompt 文本
- 模型输出文本
- 转录文本
- 任何用户自由输入的原始内容

## 🔐 安全注意事项

- 机密信息用环境变量：`"${VAR_NAME}"` 会自动从 `.env` 注入。  
- 对不可信服务器可放进容器、限制文件权限、监控调用。  

## 🧪 测试 MCP 集成
```python
from src.mcp_client import MCPClient

client = MCPClient()
print(client.list_servers())
print(client.list_tools())
```

## 🐛 故障排查

- 无法连接：先手动运行服务器命令（如 `python src/tools/my_server.py`），确认 `npx` 等命令存在。  
- 工具未出现：重启 Agent，检查日志关键字“MCP”。  
- 性能问题：禁用不需要的服务器；远程优先用 `http`；必要时缓存结果。  

## 📚 资源

- [MCP 官方文档](https://modelcontextprotocol.io/)  
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)  
- [FastMCP 示例](https://github.com/modelcontextprotocol/python-sdk/tree/main/examples)  

---

**下一步：** [Swarm 协议](SWARM_PROTOCOL.md) | [文档索引](README.md)
