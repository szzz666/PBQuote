import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthService } from '../src/auth.service';
import { exposeUploads, LOGO_MAX_BYTES, UPLOADS_ROOT } from '../src/merchant-logo';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
describe('Merchant Logo upload (without database)', () => {
  let app: NestExpressApplication;
  let service: AppService;
  const created: string[] = [];
  const slug = process.env.MERCHANT_SLUG || 'default';
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [AppController], providers: [AppService, { provide: AuthService, useValue: {
      me: async (token: string) => {
        if (token === 'owner') return { role: 'merchant', merchantSlug: slug };
        if (token === 'admin') return { role: 'super_admin' };
        if (token === 'other') return { role: 'merchant', merchantSlug: 'other' };
        throw new UnauthorizedException();
      },
    } }] }).compile();
    app = module.createNestApplication<NestExpressApplication>();
    service = module.get(AppService);
    app.setGlobalPrefix('api/v1');
    exposeUploads(app);
    await app.init();
  });
  afterAll(async () => { await app.close(); await Promise.all(created.map(path => rm(path, { force: true }))); });
  const upload = (token?: string, buffer = png, field = 'logo', filename = 'image.png') => {
    const req = request(app.getHttpServer()).post('/api/v1/merchant/' + slug + '/logo');
    if (token) req.set('Authorization', 'Bearer ' + token);
    return req.attach(field, buffer, { filename, contentType: 'image/png' });
  };
  it('requires authentication and merchant ownership', async () => {
    await upload().expect(401);
    await upload('other').expect(403);
  });
  it('stores real PNG bytes, serves publicly, and waits for config save', async () => {
    const before = await service.getAdminConfig(slug);
    for (const token of ['owner', 'admin']) {
      const response = await upload(token, png, 'logo', '../../payload.svg').expect(201);
      expect(response.body.logoUrl).toMatch(new RegExp('^/uploads/merchants/' + slug + '/[a-f0-9-]+\\.png$'));
      const path = join(UPLOADS_ROOT, response.body.logoUrl.slice('/uploads/'.length));
      created.push(path);
      expect(await readFile(path)).toEqual(png);
      const image = await request(app.getHttpServer()).get(response.body.logoUrl).expect(200).expect('Content-Type', /image\/png/);
      expect(image.body).toEqual(png);
      expect((await service.getAdminConfig(slug)).merchant.logoUrl).toEqual(before.merchant.logoUrl);
    }
    expect(created[0]).not.toEqual(created[1]);
  });
  it('rejects missing/wrong fields, forged image contents and oversize files', async () => {
    await request(app.getHttpServer()).post('/api/v1/merchant/' + slug + '/logo').set('Authorization', 'Bearer owner').expect(400);
    await upload('owner', png, 'wrong').expect(400);
    await upload('owner', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')).expect(400);
    await upload('owner', Buffer.alloc(LOGO_MAX_BYTES + 1)).expect(413);
    await request(app.getHttpServer()).post('/api/v1/merchant/unsafe%2Fslug/logo').set('Authorization', 'Bearer admin').attach('logo', png, 'logo.png').expect(400);
  });
});
