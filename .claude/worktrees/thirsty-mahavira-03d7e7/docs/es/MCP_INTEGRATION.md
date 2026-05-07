# 🔌 Guía de Integración de MCP

## 🌐 ¿Qué es MCP?

El [Protocolo de Contexto del Modelo (MCP)](https://modelcontextprotocol.io/) es un protocolo estandarizado para conectar aplicaciones de IA a fuentes externas de herramientas y datos. Con MCP, tu agente puede:

- 🔗 Conectarse a múltiples servidores MCP simultáneamente
- 🛠️ Usar cualquier herramienta expuesta por esos servidores
- 📊 Acceder a bases de datos, APIs, sistemas de archivos, navegadores y más
- 🔄 Fusionar herramientas remotas con locales de forma transparente

## 🚀 Configuración Rápida

### 1. Habilitar MCP en `.env`
```bash
MCP_ENABLED=true
```

### 2. Configurar Servidores en `mcp_servers.json`

```json
{
  "servers": [
    {
      "name": "github",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "enabled": true,
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  ]
}
```

### 3. Ejecutar el Agente
```bash
python src/agent.py
```

El agente:
- 🔌 Se conectará a todos los servidores MCP habilitados
- 🔍 Descubrirá herramientas disponibles
- 📦 Las fusionará con herramientas locales
- ✅ Listo para usar

## 🏗️ Arquitectura

```mermaid
graph TD
    Agent[🤖 GeminiAgent] --> LocalTools[🛠️ Local Tools]
    Agent --> MCPManager[🔌 MCP Client Manager]
    MCPManager --> Server1[📡 GitHub MCP]
    MCPManager --> Server2[📡 Database MCP]
    MCPManager --> Server3[📡 Custom MCP]
    LocalTools --> |Fusionadas| AllTools[📦 All Available Tools]
    MCPManager --> |Fusionadas| AllTools
```

## 📡 Transportes Soportados

| Transporte | Descripción | Caso de Uso |
|-----------|-------------|----------|
| `stdio` | Entrada/Salida Estándar | Servidores locales, herramientas CLI |
| `http` | HTTP Transmisible | Servidores remotos, servicios en la nube |
| `sse` | Server-Sent Events | Servidores HTTP heredados |

## 🛠️ Herramientas MCP Integradas

Una vez que MCP está habilitado, estas herramientas auxiliares están automáticamente disponibles:

- **`list_mcp_servers()`** — Listar todos los servidores MCP conectados
- **`list_mcp_tools()`** — Enumerar todas las herramientas MCP disponibles
- **`get_mcp_tool_help(tool_name)`** — Mostrar ayuda/documentación para una herramienta
- **`mcp_health_check()`** — Verificar el estado de salud de todos los servidores

## 📋 Servidores Preconfigurados

`mcp_servers.json` incluye plantillas para estos servidores populares:

| Servidor | Descripción | Estado |
|---------|-------------|--------|
| 🗂️ **Filesystem** | Operaciones del sistema de archivos | Listo |
| 🐙 **GitHub** | Acceso a API de GitHub | Listo |
| 🗃️ **PostgreSQL** | Operaciones de base de datos | Listo |
| 🔍 **Brave Search** | Búsqueda web | Listo |
| 💾 **Memory** | Almacenamiento persistente | Listo |
| 🌐 **Puppeteer** | Automatización de navegador | Listo |
| 💬 **Slack** | Mensajería de Slack | Listo |

Habilita lo que necesites y agrega tus claves de API.

## 🔧 Crear Servidores MCP Personalizados

Crea tu propio servidor MCP usando el [SDK de MCP Python](https://github.com/modelcontextprotocol/python-sdk) con FastMCP:

```python
from mcp.server.fastmcp import FastMCP
from typing import Dict, Any

mcp = FastMCP("Mi Servidor Personalizado")

@mcp.tool()
def validar_metadatos_evento(evento: Dict[str, Any]) -> Dict[str, Any]:
    """Valida un sobre de evento solo con metadatos."""
    requeridos = {"event_type", "timestamp", "risk_class", "workflow_id"}
    faltantes = [k for k in requeridos if k not in evento]
    return {"valido": len(faltantes) == 0, "faltantes": faltantes}

if __name__ == "__main__":
    mcp.run()
```

Regístralo en `mcp_servers.json`:

```json
{
  "name": "mi-servidor",
  "transport": "stdio",
  "command": "python",
  "args": ["ruta/a/mi_servidor.py"],
  "enabled": true
}
```

## FluencyTracr MCP Adapter Server

Referencias:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- Contrato `/api/ingest`: `docs/api/ingest.md`
- Arquitectura MCP: `docs/mcp/fluencytracr-mcp-server.md`

Lista de herramientas:
- `fluency.ingest_events` reenvia sobres de metadatos/eventos a `/api/ingest`
- `fluency.get_evidence_bundle`
- `fluency.get_control_evidence`
- `fluency.get_coverage_map`

Restricciones de entrada:
- Solo enumeraciones y campos acotados
- Rechazar campos de contenido libre
- Ventanas permitidas: `daily`, `weekly`, `30d`, `60d`, `90d`, `180d`, `360d`, `3m`, `6m`, `12m`- Enums acotados para `risk_class`, `workflow_category`, `tool_class`

Autenticacion y alcance:
- Solo identidades de servicio
- Alcance obligatorio por `org_id`
- Acceso entre organizaciones denegado en el adaptador

Limites de tasa e idempotencia:
- `fluency.ingest_events` requiere `Idempotency-Key`
- Enviar `X-FluencyTracr-Schema-Version` en ingest
- Manejar `429` con retroceso exponencial acotado
- Preservar seguridad de reintento idempotente

Ejemplos de contenido prohibido:
- Texto de prompts
- Texto de salidas del modelo
- Contenido de transcripciones
- Cualquier contenido crudo libre generado por usuario

---

**Siguiente:** [Protocolo de Swarm](SWARM_PROTOCOL.md) | [Índice Completo](README.md)
