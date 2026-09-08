#!/usr/bin/env python3
"""Minimal SPA server for the built frontend."""
import http.server
import os
import sys
import signal

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Try the actual file first
        path = self.translate_path(self.path)
        if os.path.isfile(path):
            return super().do_GET()
        # Fallback to index.html for SPA routes
        self.path = "/index.html"
        return super().do_GET()

    def log_message(self, format, *args):
        pass  # Silence request logs


def main():
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    with http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler) as httpd:
        print(f"Frontend serving at http://localhost:{PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
