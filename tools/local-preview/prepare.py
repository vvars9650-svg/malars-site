"""Prepare a NEW offline preview directory. Never overwrites an existing preview."""
import argparse
import runpy
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
destination = args.destination.resolve()
if destination.exists():
    parser.error('Destination already exists. Choose a new directory; existing preview is preserved.')
root = Path(__file__).resolve().parents[2]
module = runpy.run_path(str(root / 'backend/deploy/build_test_frontend.py'))
build = module['main']
settings = build.__globals__
settings.update(OUTPUT=destination / 'frontend', API_BASE_URL='http://localhost:8765',
                TEST_ORIGIN='http://localhost:8765', BUILD_TAG='MAL-20261110-01-checkpoint')
build()
front = destination / 'frontend'
runtime = front / 'test-runtime.js'
runtime.write_text('''// Offline preview: block external fetch before issuing any request.
(() => {
  const original = window.fetch.bind(window);
  window.fetch = (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin !== location.origin) return Promise.reject(new Error('External network disabled in local preview'));
    return original(input, options);
  };
})();
''' + runtime.read_text(encoding='utf-8').replace('position:sticky;', 'position:relative;'), encoding='utf-8')
index = front / 'index.html'
text = index.read_text(encoding='utf-8')
text = text.replace('<head>', '''<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; font-src 'self'; form-action 'self'; base-uri 'self'">''', 1)
index.write_text(text, encoding='utf-8')
shutil.copy2(Path(__file__).with_name('server.py'), destination / 'server.py')
print('Local API only. No personal fixtures or city database copied. City directory remains a dependency.')
print(f'Run: python "{destination / "server.py"}"')
