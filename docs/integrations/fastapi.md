# FastAPI Integration

Use the Vouch Python SDK as middleware or endpoint wrapper in FastAPI.

## Endpoint Wrapper

```python
from fastapi import FastAPI, HTTPException
from vouch import create_vouch, VouchConfig, VouchInput, VouchBlockedError

app = FastAPI()

vouch = create_vouch(VouchConfig(
    project_slug='my-api',
    api_endpoint='https://vouch.run',
    api_key=os.environ['VOUCH_API_KEY'],
    mode='enforce',
    policy_path='./vouch.policy.yaml',
))

@app.post("/agent/action")
async def execute_action(action_type: str, payload: dict):
    try:
        result = await vouch.protect(
            VouchInput(
                action_type=action_type,
                context={"source": "api"},
            ),
            execute_fn=lambda: process_action(action_type, payload),
        )
        return {"ok": True, "result": result}
    except VouchBlockedError as e:
        raise HTTPException(status_code=403, detail=str(e))
```

## Middleware Pattern

```python
from starlette.middleware.base import BaseHTTPMiddleware

class VouchMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path.startswith("/agent/"):
            body = await request.json()
            action_type = body.get("action_type", "unknown")

            result, _ = evaluate_policies(
                VouchInput(action_type=action_type),
                vouch.config,
            )

            if result.verdict == "BLOCK":
                return JSONResponse(
                    {"error": result.message},
                    status_code=403,
                )

        return await call_next(request)

app.add_middleware(VouchMiddleware)
```
