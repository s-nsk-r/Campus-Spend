"""
BACSE344 DA3 - Clustered Backend & Load Balancer Engine
Runs 3 live FastAPI/Uvicorn server nodes (ports 8001, 8002, 8003)
and an HTTP Reverse Proxy Load Balancer on port 8080 (with fallback to 8088/9000).
"""

import sys
import os
import time
import asyncio
import threading
from typing import List, Dict, Any, Optional
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import httpx
import uvicorn
from main import app as base_app

# Node Configurations (Ports 8001, 8002, 8003)
NODES = [
    {"id": "backend-1", "port": 8001},
    {"id": "backend-2", "port": 8002},
    {"id": "backend-3", "port": 8003},
]

# Track active/enabled nodes and failover configuration (supports Q1c failover simulation)
active_node_ports = {8001, 8002, 8003}
ENABLE_RETRY = True
KILLED_NODES = set()

# Global Load Balancer state
_lb_port: int = 8080
_lb_server: Optional[ThreadingHTTPServer] = None

# High-performance persistent connection pool for reverse proxy
_proxy_client = httpx.Client(
    limits=httpx.Limits(max_connections=250, max_keepalive_connections=150),
    timeout=25.0
)

class NodeIdentityMiddleware:
    """ASGI Middleware ensuring each node stamps its unique identity."""
    def __init__(self, app, instance_id: str):
        self.app = app
        self.instance_id = instance_id

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            if "state" not in scope:
                scope["state"] = {}
            scope["state"]["instance_id"] = self.instance_id
        await self.app(scope, receive, send)


def start_node_server(node_id: str, port: int):
    """Starts a live Uvicorn ASGI server instance on a dedicated thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    wrapped_app = NodeIdentityMiddleware(base_app, node_id)
    config = uvicorn.Config(
        app=wrapped_app,
        host="127.0.0.1",
        port=port,
        log_level="critical",
        access_log=False
    )
    server = uvicorn.Server(config)
    loop.run_until_complete(server.serve())


class ReverseProxyLoadBalancer(BaseHTTPRequestHandler):
    """
    HTTP Reverse Proxy Load Balancer.
    Implements Nginx-compliant Round-Robin routing and upstream failover retry.
    """
    current_index = 0
    lock = threading.Lock()

    def do_GET(self):
        global ENABLE_RETRY, KILLED_NODES

        # Health / Status probe endpoint
        if self.path == "/lb-status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            active_list = [n["id"] for n in NODES if n["port"] in active_node_ports and n["id"] not in KILLED_NODES]
            payload = f'{{"status": "UP", "port": {_lb_port}, "algorithm": "round-robin", "active_nodes": {active_list}, "retry_enabled": {str(ENABLE_RETRY).lower()}}}\n'
            self.wfile.write(payload.encode())
            return

        # Dedicated runtime control endpoint for Q1c failover simulation
        if self.path.startswith("/lb-control"):
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            if "retry" in params:
                ENABLE_RETRY = (params["retry"][0].lower() in ["1", "true", "on", "yes"])
            if "kill" in params:
                KILLED_NODES.add(params["kill"][0])
            if "restore" in params:
                if params["restore"][0] == "all":
                    KILLED_NODES.clear()
                else:
                    KILLED_NODES.discard(params["restore"][0])

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = f'{{"retry_enabled": {str(ENABLE_RETRY).lower()}, "killed_nodes": {list(KILLED_NODES)}}}\n'
            self.wfile.write(payload.encode())
            return

        # Attempt routing with Round-Robin and automatic failover retry
        max_attempts = len(NODES) if ENABLE_RETRY else 1
        response_sent = False

        for _ in range(max_attempts):
            with ReverseProxyLoadBalancer.lock:
                node = NODES[ReverseProxyLoadBalancer.current_index % len(NODES)]
                ReverseProxyLoadBalancer.current_index += 1

            # Check if node has been killed (Q1c node failure simulation)
            if node["id"] in KILLED_NODES:
                if not ENABLE_RETRY:
                    # Baseline Nginx without proxy_next_upstream drops the request immediately
                    break
                else:
                    # Nginx with proxy_next_upstream retries next healthy upstream
                    continue

            # Check if node is active
            if node["port"] not in active_node_ports:
                if not ENABLE_RETRY:
                    break
                else:
                    continue

            target_url = f"http://127.0.0.1:{node['port']}{self.path}"
            try:
                resp = _proxy_client.get(target_url)

                self.send_response(resp.status_code)
                for k, v in resp.headers.items():
                    if k.lower() not in ["content-length", "transfer-encoding", "content-encoding", "server", "x-served-by", "x-backend-instance"]:
                        self.send_header(k, v)
                self.send_header("X-Served-By", f"{node['id']}:{node['port']}")
                self.send_header("X-Backend-Instance", node["id"])
                self.send_header("Content-Length", str(len(resp.content)))
                self.end_headers()
                self.wfile.write(resp.content)
                response_sent = True
                break
            except Exception:
                if not ENABLE_RETRY:
                    break
                # Connection refused or node down -> failover to next upstream
                continue

        if not response_sent:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": "Bad Gateway - No healthy upstream available"}\n')

    def log_message(self, format, *args):
        return  # Suppress standard logging to keep output clean


class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    """Multi-threaded HTTPServer handling high concurrency without blocking."""
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 512


def get_lb_port() -> int:
    global _lb_port
    return _lb_port


def ensure_cluster_running() -> bool:
    """Checks if the cluster is already active; if not, launches all nodes and LB."""
    global _lb_port, _lb_server

    candidate_ports = [8080, 8088, 9000, 9090, 8000]

    # Check if already running on any candidate port
    for p in candidate_ports:
        try:
            r = httpx.get(f"http://127.0.0.1:{p}/lb-status", timeout=0.4)
            if r.status_code == 200:
                _lb_port = p
                return True
        except Exception:
            pass

    # Launch 3 backend nodes in background threads
    for node in NODES:
        t = threading.Thread(target=start_node_server, args=(node["id"], node["port"]), daemon=True)
        t.start()

    # Find an open port for the Load Balancer that Windows allows
    bound_server = None
    for p in candidate_ports:
        try:
            bound_server = ReusableThreadingHTTPServer(("127.0.0.1", p), ReverseProxyLoadBalancer)
            _lb_port = p
            _lb_server = bound_server
            break
        except Exception:
            continue

    if not bound_server:
        print(" [!] Fatal: Could not bind Load Balancer on any candidate port (8080, 8088, 9000).")
        return False

    # Launch Load Balancer in background thread
    lb_thread = threading.Thread(target=bound_server.serve_forever, daemon=True)
    lb_thread.start()

    # Wait for cluster to become ready
    for _ in range(30):
        time.sleep(0.15)
        try:
            r = httpx.get(f"http://127.0.0.1:{_lb_port}/lb-status", timeout=0.5)
            if r.status_code == 200:
                return True
        except Exception:
            continue
    return False

if __name__ == "__main__":
    print("Starting CampusSpend Live Clustered Infrastructure...")
    if ensure_cluster_running():
        print(f"✓ Cluster is LIVE on http://127.0.0.1:{_lb_port} (3 Backend Nodes Active)")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Cluster stopped.")
    else:
        print("Failed to initialize cluster.")
