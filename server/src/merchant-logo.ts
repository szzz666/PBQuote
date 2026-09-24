import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AuthService } from './auth.service';

export const UPLOADS_ROOT = join(__dirname, '..', 'uploads');
export const LOGO_MAX_BYTES = 256 * 1024;
export const ASSET_MAX_BYTES = 1024 * 1024;
export type LogoFile = { buffer: Buffer; size: number };

export function exposeUploads(app: NestExpressApplication) {
  app.useStaticAssets(UPLOADS_ROOT, {
    prefix: '/uploads/',
    dotfiles: 'deny',
    index: false,
    maxAge: 0,
    setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'no-cache'); },
  });
}

const sniffExtension = (b: Buffer): 'png' | 'jpg' | 'webp' | 'gif' | null => {
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && b.toString('ascii', 12, 16) === 'IHDR') return 'png';
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length >= 10 && ['GIF87a', 'GIF89a'].includes(b.toString('ascii', 0, 6))) return 'gif';
  if (b.length >= 16 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(b.toString('ascii', 12, 16))) return 'webp';
  return null;
};

export function logoExtension(file?: LogoFile): 'png' | 'jpg' | 'webp' | 'gif' {
  if (!file?.buffer.length) throw new BadRequestException('请选择 Logo 文件（字段 logo）');
  if (file.buffer.length > LOGO_MAX_BYTES) throw new BadRequestException('Logo 不能超过 256 KiB');
  const ext = sniffExtension(file.buffer);
  if (!ext) throw new BadRequestException('Logo 仅支持 PNG、JPEG、WebP 或 GIF 图片');
  return ext;
}

export function assetExtension(file?: LogoFile): 'png' | 'jpg' | 'webp' | 'gif' {
  if (!file?.buffer.length) throw new BadRequestException('请选择图片文件（字段 image）');
  if (file.buffer.length > ASSET_MAX_BYTES) throw new BadRequestException('图片不能超过 1 MiB');
  const ext = sniffExtension(file.buffer);
  if (!ext) throw new BadRequestException('图片仅支持 PNG、JPEG、WebP 或 GIF');
  return ext;
}

@Injectable()
export class MerchantLogoGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const identity = await this.auth.me(request.headers.authorization?.replace(/^Bearer\s+/i, ''));
    if (!identity) throw new UnauthorizedException('上传 Logo 需要登录');
    if (identity.role !== 'super_admin' && (identity.role !== 'merchant' || identity.merchantSlug !== request.params.slug)) throw new ForbiddenException('只能上传当前商家的 Logo');
    return true;
  }
}
