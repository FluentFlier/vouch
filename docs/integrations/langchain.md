# LangChain Integration

Add Vouch as a tool interceptor in LangChain to enforce policies before tool execution.

## Python

```python
from vouch import create_vouch, VouchConfig, VouchInput, VouchBlockedError
from langchain.tools import BaseTool

vouch = create_vouch(VouchConfig(
    project_slug='my-agent',
    api_endpoint='https://vouch.run',
    api_key=os.environ['VOUCH_API_KEY'],
    mode='observe',
    policy_path='./vouch.policy.yaml',
))

class VouchWrappedTool(BaseTool):
    """Wraps any LangChain tool with Vouch policy enforcement."""

    wrapped_tool: BaseTool

    @property
    def name(self) -> str:
        return self.wrapped_tool.name

    @property
    def description(self) -> str:
        return self.wrapped_tool.description

    async def _arun(self, *args, **kwargs):
        return await vouch.protect(
            VouchInput(
                action_type=self.wrapped_tool.name,
                context={"source": "langchain"},
            ),
            execute_fn=lambda: self.wrapped_tool._arun(*args, **kwargs),
        )

    def _run(self, *args, **kwargs):
        raise NotImplementedError("Use async execution")
```

## Usage

```python
from langchain.tools import DuckDuckGoSearchRun

search = DuckDuckGoSearchRun()
safe_search = VouchWrappedTool(wrapped_tool=search)

# Use safe_search in your agent chain
```
