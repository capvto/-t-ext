import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../helpers/test-app';

describe('paste API integration', () => {
  let appContext: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    appContext = await createTestApp();
  });

  afterEach(async () => {
    await appContext.app.close();
  });

  async function publish(overrides?: Partial<{ title: string; content: string; slug: string }>) {
    return request(appContext.app.server)
      .post('/publish')
      .send({
        title: 'Test title',
        content: 'Initial content',
        ...overrides
      });
  }

  it('POST /publish succeeds and never exposes editHash', async () => {
    const response = await publish();

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.id).toMatch(/^[0-9a-zA-Z]{8}$/);
    expect(response.body.editCode).toMatch(/^[0-9a-zA-Z]{12}$/);
    expect(response.body.viewUrl).toBe(`/${response.body.id}`);
    expect(response.body.editHash).toBeUndefined();

    const stored = await appContext.repository.findById(response.body.id);
    expect(stored?.editHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('sets cache-control no-store on successful and error responses', async () => {
    const created = await publish({ slug: 'header-check' });
    expect(created.headers['cache-control']).toBe('no-store');

    const found = await request(appContext.app.server).get(`/paste?id=${created.body.id}`);
    expect(found.headers['cache-control']).toBe('no-store');

    const notFound = await request(appContext.app.server).get('/paste?id=missing-one');
    expect(notFound.headers['cache-control']).toBe('no-store');
  });

  it('POST /publish rejects empty content', async () => {
    const response = await publish({ content: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Empty content');
  });

  it('POST /publish rejects payload content over 200k chars', async () => {
    const response = await publish({ content: 'a'.repeat(200_001) });

    expect(response.status).toBe(413);
    expect(response.body.error).toBe('Content too large');
  });

  it('POST /publish rejects invalid or reserved slugs', async () => {
    const invalid = await publish({ slug: 'a' });
    expect(invalid.status).toBe(400);

    const reserved = await publish({ slug: 'api' });
    expect(reserved.status).toBe(400);
  });

  it('POST /publish rejects duplicate slug with 409', async () => {
    const first = await publish({ slug: 'my-note' });
    expect(first.status).toBe(200);

    const second = await publish({ slug: 'my-note' });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('This link is already in use');
  });

  it('GET /paste returns 400 when id missing', async () => {
    const response = await request(appContext.app.server).get('/paste');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing id');
  });

  it('GET /paste returns 404 for unknown id', async () => {
    const response = await request(appContext.app.server).get('/paste?id=unknown-id');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not found');
  });

  it('POST /update rejects wrong editCode with 403', async () => {
    const created = await publish({ slug: 'update-me' });

    const response = await request(appContext.app.server).post('/update').send({
      id: created.body.id,
      editCode: 'WrongCode123',
      content: 'Next content'
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid edit code');
  });

  it('POST /update returns 401 when editCode is missing', async () => {
    const created = await publish({ slug: 'update-no-code' });

    const response = await request(appContext.app.server).post('/update').send({
      id: created.body.id,
      content: 'Next content'
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing edit code');
  });

  it('POST /update succeeds with valid editCode', async () => {
    const created = await publish({ slug: 'update-ok' });

    const response = await request(appContext.app.server).post('/update').send({
      id: created.body.id,
      editCode: created.body.editCode,
      content: 'Updated content'
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(typeof response.body.updatedAt).toBe('string');

    const stored = await appContext.repository.findById(created.body.id);
    expect(stored?.content).toBe('Updated content');
  });

  it('POST /delete rejects wrong editCode with 403', async () => {
    const created = await publish({ slug: 'delete-wrong' });

    const response = await request(appContext.app.server).post('/delete').send({
      id: created.body.id,
      editCode: 'WrongCode123'
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid edit code');
  });

  it('POST /delete returns 401 when editCode is missing', async () => {
    const created = await publish({ slug: 'delete-no-code' });

    const response = await request(appContext.app.server).post('/delete').send({
      id: created.body.id
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Missing edit code');
  });

  it('POST /delete succeeds and paste becomes unavailable', async () => {
    const created = await publish({ slug: 'delete-ok' });

    const deleted = await request(appContext.app.server).post('/delete').send({
      id: created.body.id,
      editCode: created.body.editCode
    });

    expect(deleted.status).toBe(200);
    expect(deleted.body.ok).toBe(true);

    const afterDelete = await request(appContext.app.server).get(`/paste?id=${created.body.id}`);
    expect(afterDelete.status).toBe(404);
    expect(afterDelete.body.error).toBe('Not found');
  });
});
