#!/usr/bin/env python3
"""Raw TCP gateway: LAN :3923 -> loopback CopySpace :3925.

HTTP methods, cookies, streaming uploads, Range requests, and protocol upgrades
are forwarded byte-for-byte without parsing or buffering request bodies.
"""
from __future__ import annotations

import logging
import os
import selectors
import socket
import socketserver
import sys

LISTEN_HOST = os.environ.get("COPYSPACE_GATEWAY_LISTEN_HOST", "192.168.50.72")
LISTEN_PORT = int(os.environ.get("COPYSPACE_GATEWAY_LISTEN_PORT", "3923"))
TARGET_HOST = os.environ.get("COPYSPACE_GATEWAY_TARGET_HOST", "127.0.0.1")
TARGET_PORT = int(os.environ.get("COPYSPACE_GATEWAY_TARGET_PORT", "3925"))
BUFFER_SIZE = 64 * 1024


class GatewayHandler(socketserver.BaseRequestHandler):
    def handle(self) -> None:
        client = self.request
        try:
            upstream = socket.create_connection((TARGET_HOST, TARGET_PORT), timeout=10)
        except OSError:
            logging.exception("Cannot connect to CopySpace at %s:%s", TARGET_HOST, TARGET_PORT)
            return

        with upstream:
            client.settimeout(None)
            upstream.settimeout(None)
            peers = {client: upstream, upstream: client}
            with selectors.DefaultSelector() as selector:
                selector.register(client, selectors.EVENT_READ)
                selector.register(upstream, selectors.EVENT_READ)
                while selector.get_map():
                    for key, _ in selector.select():
                        source = key.fileobj
                        destination = peers[source]
                        try:
                            payload = source.recv(BUFFER_SIZE)
                        except OSError:
                            payload = b""
                        if not payload:
                            selector.unregister(source)
                            try:
                                destination.shutdown(socket.SHUT_WR)
                            except OSError:
                                pass
                            continue
                        try:
                            destination.sendall(payload)
                        except OSError:
                            return


class GatewayServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True
    request_queue_size = 128


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        with GatewayServer((LISTEN_HOST, LISTEN_PORT), GatewayHandler) as server:
            logging.info(
                "Gateway listening on %s:%s -> %s:%s",
                LISTEN_HOST, LISTEN_PORT, TARGET_HOST, TARGET_PORT,
            )
            server.serve_forever(poll_interval=0.5)
    except OSError:
        logging.exception("Gateway failed to bind or run")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
