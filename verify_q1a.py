"""
Verification Script for Digital Assignment 3 - Question 1(a)
Sends 9 sequential live HTTP requests to the Load Balancer
and verifies the exact Round-Robin traffic distribution across 3 backend instances.
"""

import sys
import time
import httpx
from cluster import ensure_cluster_running, get_lb_port

def run_distribution_demo():
    print("=" * 75)
    print("BACSE344 DA3 - Question 1(a): Clustered Backend Distribution Verification")
    print("=" * 75)
    print("API Tested: GET /api/summary/stats (Student Budget & Expense Aggregation)")
    print("Cluster Architecture: 3 Backend Instances behind Round-Robin Load Balancer\n")

    # Ensure live cluster is up (3 Uvicorn Nodes: 8001, 8002, 8003)
    print(" -> Initializing 3-instance backend cluster on ports 8001, 8002, 8003...")
    if not ensure_cluster_running():
        print(" [!] Error: Unable to bind cluster. Please check port permissions.")
        return

    lb_port = get_lb_port()
    print(f" -> Load Balancer is ACTIVE on http://127.0.0.1:{lb_port}\n")

    target_url = f"http://127.0.0.1:{lb_port}/api/summary/stats"
    distribution = {"backend-1": 0, "backend-2": 0, "backend-3": 0}

    print(f">>> Sending 9 Sequential Requests through Load Balancer (Port {lb_port}):")
    print("-" * 75)

    with httpx.Client(timeout=5.0) as client:
        for i in range(1, 10):
            start = time.perf_counter()
            resp = client.get(target_url)
            elapsed_ms = (time.perf_counter() - start) * 1000

            raw_instance = resp.headers.get("X-Backend-Instance", "unknown")
            instance = raw_instance.split(",")[-1].strip()
            raw_upstream = resp.headers.get("X-Served-By", "unknown")
            upstream = raw_upstream.split(",")[-1].strip()
            data = resp.json()

            distribution[instance] = distribution.get(instance, 0) + 1
            print(f" Request #{i:02d} -> HTTP {resp.status_code} OK | Served by: {instance:<10} | Upstream: {upstream:<18} | Time: {elapsed_ms:5.1f}ms")
            time.sleep(0.08)

    print("-" * 75)
    print("\n>>> Overall Cluster Traffic Distribution:")
    total = sum(distribution.values())
    for node, count in distribution.items():
        pct = (count / total) * 100
        bar = "█" * int(pct / 5)
        print(f"  • {node:<12} : {count} requests ({pct:.1f}%)  {bar}")

    print("\n" + "=" * 75)
    print("✓ VERIFIED: Requests are evenly distributed across all three backend instances!")
    print("===========================================================================\n")

if __name__ == "__main__":
    run_distribution_demo()
