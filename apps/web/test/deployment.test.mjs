import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import { deploymentTarget } from '../scripts/deployment-target.mjs'

test('deployment checks accept only project HTTPS domains and numeric local fixtures', () => {
  for (const value of [
    'https://leeeeeoy.xyz/',
    'https://portfolio.leeeeeoy.xyz/',
    'https://www.leeeeeoy.xyz/',
    'https://preview-portfolio.leeeeeoy.xyz/api/visits',
    'http://127.0.0.1:8892/',
    'http://[::1]:8788/',
  ])
    assert.equal(deploymentTarget(value).href, value)
  for (const value of [
    'http://169.254.169.254/',
    'http://192.168.1.1/',
    'https://leeeeeoy.xyz.evil.test/',
    'https://leeeeeoy.xyz@evil.test/',
    'https://user:password@leeeeeoy.xyz/',
    'http://leeeeeoy.xyz/',
    'https://leeeeeoy.xyz:8443/',
    'file:///etc/hosts',
  ])
    assert.throws(() => deploymentTarget(value))
})

test('a redirect is rejected without sending a request to its destination', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-deployment-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, 'scripts'))
  await mkdir(join(directory, 'dist'))
  for (const name of ['check-deployment.mjs', 'deployment-target.mjs']) {
    await copyFile(
      new URL(`../scripts/${name}`, import.meta.url),
      join(directory, 'scripts', name),
    )
  }
  await writeFile(
    join(directory, 'dist/index.html'),
    '<script src="/assets/a.js"></script><link href="/assets/a.css">',
  )
  let destinationRequests = 0
  let redirectLocation = '/private'
  const server = createServer((request, response) => {
    if (request.url === '/') {
      response.writeHead(302, { Location: redirectLocation })
      response.end()
    } else {
      destinationRequests++
      response.end('synthetic private destination')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  await fetch(base)
  assert.equal(
    destinationRequests,
    1,
    'positive control must follow the redirect',
  )
  destinationRequests = 0
  await assert.rejects(
    promisify(execFile)(
      process.execPath,
      [join(directory, 'scripts/check-deployment.mjs'), base],
      {
        env: { HOME: directory, TMPDIR: directory },
        timeout: 10000,
      },
    ),
  )
  assert.equal(destinationRequests, 0)
  redirectLocation =
    'https://evil.test/?next=https://team.cloudflareaccess.com/'
  await assert.rejects(
    promisify(execFile)(
      process.execPath,
      [join(directory, 'scripts/check-deployment.mjs'), base, '--protected'],
      { env: { HOME: directory, TMPDIR: directory }, timeout: 10000 },
    ),
  )
  redirectLocation = 'https://team.cloudflareaccess.com/login'
  const protectedResult = await promisify(execFile)(
    process.execPath,
    [join(directory, 'scripts/check-deployment.mjs'), base, '--protected'],
    { env: { HOME: directory, TMPDIR: directory }, timeout: 10000 },
  )
  assert.match(protectedResult.stdout, /PASS/)
  assert.equal(destinationRequests, 0)
})
