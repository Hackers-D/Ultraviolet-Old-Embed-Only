import os
import signal
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse
from wsgiref.simple_server import make_server
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.websockets import WebSocket
from wisp_server_python import wisp
from bare_server_python import create_bare_server
from ultraviolet import uv_path
from epoxy_transport import epoxy_path
from bare_as_module3 import bare_module_path
from bare_mux.python import baremux_path

app = FastAPI()
bare = create_bare_server("/bare/")

current_dir = os.path.dirname(os.path.abspath(__file__))
public_path = "public"

app.mount("/", StaticFiles(directory=public_path), name="static")
app.mount("/uv/", StaticFiles(directory=uv_path), name="uv")
app.mount("/epoxy/", StaticFiles(directory=epoxy_path), name="epoxy")
app.mount("/baremux/", StaticFiles(directory=baremux_path), name="baremux")
app.mount("/baremod/", StaticFiles(directory=bare_module_path), name="baremod")

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc: Exception):
    return FileResponse(os.path.join(current_dir, public_path, "404.html"), status_code=404)

@app.middleware("http")
async def bare_middleware(request: Request, call_next):
    if bare.should_route(request):
        return await bare.route_request(request)
    return await call_next(request)

@app.websocket("/wisp/")
async def websocket_endpoint(websocket: WebSocket):
    await wisp.route_request(websocket)

@app.websocket("{path:path}")
async def websocket_catchall(websocket: WebSocket):
    if bare.should_route(websocket):
        await bare.route_upgrade(websocket)
    else:
        await websocket.close()

def shutdown(signum, frame):
    print("SIGTERM signal received: closing HTTP server")
    bare.close()
    sys.exit(0)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    
    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print(f"Listening on:")
    print(f"\thttp://localhost:{port}")
    print(f"\thttp://127.0.0.1:{port}")

    uvicorn.run(app, host="0.0.0.0", port=port)
