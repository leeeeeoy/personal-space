import assert from 'node:assert/strict'

const hosts = new Set([
  'leeeeeoy.xyz',
  'portfolio.leeeeeoy.xyz',
  'www.leeeeeoy.xyz',
  'preview-portfolio.leeeeeoy.xyz',
])

export function deploymentTarget(value) {
  const url = new URL(value)
  const remote =
    url.protocol === 'https:' && !url.port && hosts.has(url.hostname)
  const local =
    url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname)
  assert.ok(
    (remote || local) && !url.username && !url.password,
    'Use a project HTTPS domain or numeric HTTP loopback without credentials',
  )
  return url
}
