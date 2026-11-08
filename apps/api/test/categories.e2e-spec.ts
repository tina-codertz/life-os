import type { INestApplication } from '@nestjs/common';
import type { AuthResult } from '@life-os/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp } from './utils/create-test-app.js';
import { resetDatabase } from './utils/test-db.js';

const PASSWORD = 'correct horse battery';

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tina: AuthResult;
  let juma: AuthResult;

  const http = () => request(app.getHttpServer());
  const as = (who: AuthResult) => {
    const auth = { Authorization: `Bearer ${who.accessToken}` };
    return {
      list: () => http().get('/api/v1/categories').set(auth),
      create: (body: object) => http().post('/api/v1/categories').set(auth).send(body),
      update: (id: string, body: object) =>
        http().patch(`/api/v1/categories/${id}`).set(auth).send(body),
      remove: (id: string) => http().delete(`/api/v1/categories/${id}`).set(auth),
    };
  };
  const register = async (email: string): Promise<AuthResult> =>
    (
      await http()
        .post('/api/v1/auth/register')
        .send({ email, password: PASSWORD, displayName: 'X' })
        .expect(201)
    ).body.data;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    tina = await register('tina@example.com');
    juma = await register('juma@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, lists in order, updates and deletes', async () => {
    const work = (
      await as(tina).create({ name: ' Work ', color: 'blue', icon: 'briefcase' }).expect(201)
    ).body.data;
    expect(work).toEqual({
      id: expect.any(String),
      name: 'Work',
      color: 'blue',
      icon: 'briefcase',
      sortOrder: 0,
    });
    await as(tina).create({ name: 'Health', color: 'green' }).expect(201);

    const list = (await as(tina).list().expect(200)).body.data;
    expect(list.map((c: { name: string }) => c.name)).toEqual(['Work', 'Health']);

    const renamed = (await as(tina).update(work.id, { name: 'Job', icon: null }).expect(200)).body
      .data;
    expect(renamed).toMatchObject({ name: 'Job', icon: null, color: 'blue' });

    await as(tina).remove(work.id).expect(204);
    expect((await as(tina).list()).body.data).toHaveLength(1);
  });

  it('names are unique per user regardless of letter case', async () => {
    await as(tina).create({ name: 'Work', color: 'blue' }).expect(201);
    const res = await as(tina).create({ name: 'WORK', color: 'red' }).expect(409);
    expect(res.body.error).toMatchObject({
      code: 'CATEGORY_NAME_TAKEN',
      details: [{ field: 'name', message: 'You already have a category with this name.' }],
    });

    // Renaming onto an existing name is refused too, but keeping your own name is fine.
    const health = (await as(tina).create({ name: 'Health', color: 'green' })).body.data;
    await as(tina).update(health.id, { name: 'work' }).expect(409);
    await as(tina).update(health.id, { name: 'HEALTH' }).expect(200);

    // Another user can have the same name.
    await as(juma).create({ name: 'Work', color: 'teal' }).expect(201);
  });

  // Two phones creating the same name at the same moment: both pass the name check, and the
  // database's unique index must stop the second (the service turns that into the same 409).
  it('creating the same name at once still makes only one', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        as(tina).create({ name: i % 2 ? 'Gym' : 'GYM', color: 'green' }),
      ),
    );
    expect(results.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([
      201, 409, 409, 409, 409,
    ]);
    for (const r of results.filter((res) => res.status === 409)) {
      expect(r.body.error.code).toBe('CATEGORY_NAME_TAKEN');
    }
  });

  it('deleting a category keeps its tasks, without a category', async () => {
    const work = (await as(tina).create({ name: 'Work', color: 'blue' })).body.data;
    const task = await prisma.task.create({
      data: { userId: tina.user.id, title: 'Write report', categoryId: work.id },
    });

    await as(tina).remove(work.id).expect(204);
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).toMatchObject({
      title: 'Write report',
      categoryId: null,
    });
  });

  describe('one user can never touch another', () => {
    it("another user's category is 404 for read, update and delete, and untouched", async () => {
      const work = (await as(tina).create({ name: 'Work', color: 'blue' })).body.data;

      expect((await as(juma).list()).body.data).toEqual([]);
      const res = await as(juma).update(work.id, { name: 'Hacked' }).expect(404);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
      await as(juma).remove(work.id).expect(404);

      expect((await as(tina).list()).body.data[0]).toMatchObject({ name: 'Work' });
    });

    it('a malformed ID is the same 404, not a 400', async () => {
      const res = await as(tina).update('not-a-uuid', { name: 'x' }).expect(404);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });

    it('a body cannot set the owner', async () => {
      await as(tina).create({ name: 'Work', color: 'blue', userId: juma.user.id }).expect(400);
    });
  });

  it('validates with the shared schema', async () => {
    const res = await as(tina).create({ name: '', color: '#ff0000' }).expect(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual([
      'name',
      'color',
    ]);
  });

  it('caps the number of categories', async () => {
    await prisma.category.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({
        userId: tina.user.id,
        name: `C${i}`,
        color: 'gray',
      })),
    });
    const res = await as(tina).create({ name: 'One more', color: 'gray' }).expect(422);
    expect(res.body.error.code).toBe('CATEGORY_LIMIT_REACHED');
  });

  it('needs a login', async () => {
    await http().get('/api/v1/categories').expect(401);
  });
});
