"""Local visual preview only. Never connects to cloud services."""
import hashlib
import hmac
import json
import sqlite3
import uuid
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DB = sqlite3.connect(ROOT / 'preview.sqlite3', check_same_thread=False)
DB.execute('CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY, token TEXT, record TEXT)')
DB.commit()


CUSTOMER_REQUESTS = {}
API_LOCK = threading.RLock()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'frontend'), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Resume links can contain tokens: do not log request URLs.
        pass

    def reply(self, code, value):
        body = json.dumps(value, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlsplit(self.path).path.startswith('/api/'):
            return self.api()
        return super().do_GET()

    def do_POST(self):
        self.api()

    def do_PUT(self):
        self.api()

    def api(self):
        with API_LOCK:
            return self.api_locked()

    def api_locked(self):
        path = urlsplit(self.path).path
        if path == '/api/customer-requests' and self.command == 'POST':
            try:
                size = int(self.headers.get('Content-Length', 0))
                if size > 262144:
                    return self.reply(413, {'error': 'invalid_body_size'})
                body = json.loads(self.rfile.read(size))
                required = ['name', 'contact', 'email', 'region', 'city', 'description']
                if not all(isinstance(body.get(k), str) and body[k].strip() for k in required):
                    return self.reply(400, {'error': 'required_fields'})
                if body.get('consent') is not True or body.get('consent_version') != 'CONSENT-CUSTOMER-PD-1.0':
                    return self.reply(400, {'error': 'consent_required'})
                key = str(uuid.UUID(self.headers.get('Idempotency-Key', '')))
                fingerprint = json.dumps(body, sort_keys=True)
                old = CUSTOMER_REQUESTS.get(key)
                if old and old[0] != fingerprint:
                    return self.reply(409, {'error': 'idempotency_conflict'})
                record = old[1] if old else {'request_id': 'LOCAL-' + uuid.uuid4().hex[:8].upper(), 'local_preview': True}
                CUSTOMER_REQUESTS[key] = (fingerprint, record)
                return self.reply(200 if old else 201, {'data': record, 'local_preview': True})
            except (ValueError, TypeError):
                return self.reply(400, {'error': 'Invalid local preview request'})
        prefix = '/api/participant-drafts'
        if path != prefix and not path.startswith(prefix + '/'):
            return self.reply(404, {'error': 'This API is unavailable in local preview.'})
        try:
            size = int(self.headers.get('Content-Length', 0))
            if size > 262144:
                return self.reply(413, {'error': 'Preview payload too large'})
            body = json.loads(self.rfile.read(size)) if size else {}
            token = self.headers.get('X-Participant-Token', '')
            if not token:
                return self.reply(401, {'error': 'Missing preview token'})
            digest = hashlib.sha256(token.encode()).hexdigest()
            creating = path == prefix and self.command == 'POST'
            intake = str(uuid.UUID(self.headers.get('Idempotency-Key', '') if creating else path[len(prefix) + 1:].split('/')[0]))
            row = DB.execute('SELECT token, record FROM drafts WHERE id=?', (intake,)).fetchone()
            if row and not hmac.compare_digest(row[0], digest):
                return self.reply(401, {'error': 'Invalid preview token'})
            if not row and not creating:
                return self.reply(404, {'error': 'Local draft not found'})
            if creating:
                record = json.loads(row[1]) if row else dict(intake_id=intake, public_number='LOCAL-' + intake[:8].upper(), answers=body.get('answers', {}), revision=1, status='draft')
                code = 200 if row else 201
            else:
                record = json.loads(row[1])
                code = 200
                if self.command == 'GET' and path == prefix + '/' + intake:
                    return self.reply(200, {'data': record, 'local_preview': True})
                submitting = path == prefix + '/' + intake + '/submit' and self.command == 'POST'
                if not submitting and not (self.command == 'PUT' and path == prefix + '/' + intake):
                    return self.reply(404, {'error': 'Unknown preview operation'})
                if self.headers.get('X-Intake-Revision') != str(record['revision']):
                    return self.reply(409, {'error': 'Draft revision changed'})
                record['answers'] = body.get('answers', {})
                record['revision'] += 1
                if submitting:
                    code = 201 if record['status'] == 'draft' else 200
                    record['status'] = 'review_pending'
            DB.execute('INSERT OR REPLACE INTO drafts VALUES (?, ?, ?)', (intake, digest, json.dumps(record, ensure_ascii=False)))
            DB.commit()
            self.reply(code, {'data': record, 'local_preview': True})
        except (ValueError, TypeError, KeyError):
            self.reply(400, {'error': 'Invalid local preview request'})


ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
