import assert from 'node:assert/strict';
import { JSDOM, CookieJar, VirtualConsole } from 'jsdom';
export async function localBrowser(path = '/entrar') {
  const base = 'http://localhost:5173';
  const response = await fetch(base + path); assert.equal(response.status, 200);
  const html = await response.text();
  const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
  assert.ok(scriptPath);
  const scriptResponse = await fetch(new URL(scriptPath, base)); assert.equal(scriptResponse.status, 200);
  const script = await scriptResponse.text();
  const jar = new CookieJar(), errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM(html, { url: base + path, runScripts: 'outside-only', pretendToBeVisual: true, cookieJar: jar, virtualConsole });
  const window = dom.window;
  window.confirm = () => true;
  window.fetch = async (input, options = {}) => {
    const url = new URL(input, window.location.href); assert.equal(url.origin, base);
    const headers = new Headers(options.headers);
    const cookies = jar.getCookieStringSync(url.href); if (cookies) headers.set('Cookie', cookies);
    if (options.method && !['GET', 'HEAD'].includes(options.method)) headers.set('Origin', base);
    let body = options.body;
    if (body instanceof window.FormData) {
      const converted = new FormData();
      for (const [name, value] of body.entries()) {
        if (value instanceof window.File) {
          const bytes = await new Promise((resolve, reject) => {
            const reader = new window.FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsArrayBuffer(value);
          });
          converted.append(name, new Blob([bytes], { type: value.type }), value.name);
        } else converted.append(name, value);
      }
      body = converted;
    }
    const result = await fetch(url, { ...options, headers, body });
    for (const cookie of result.headers.getSetCookie()) jar.setCookieSync(cookie, url.href);
    return result;
  };
  window.eval(script);
  return { window, document: window.document, errors };
}
