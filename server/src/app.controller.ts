import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, UnauthorizedException, Optional, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { randomBytes, scryptSync } from 'node:crypto';
import { AuthService } from './auth.service';
import { AppService } from './app.service';
import { InstallService } from './install.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ASSET_MAX_BYTES, LOGO_MAX_BYTES, MerchantLogoGuard } from './merchant-logo';
import { boxShapeCatalog } from './box-shapes';
import type { LogoFile } from './merchant-logo';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly installService: InstallService, @Optional() private readonly authService?: AuthService) {}
  private async identity(authorization?: string) {
    return this.authService?.me(authorization?.replace(/^Bearer\s+/i, ''));
  }
  @Get() getHello() { return 'Hello World!'; }
  @Post('auth/login') async login(@Body() body: { username: string; password: string }) { return this.authService ? await this.authService.login(body.username, body.password) : undefined; }
  @Get('auth/me') async me(@Headers('authorization') authorization?: string) { return this.authService ? await this.authService.me(authorization?.replace(/^Bearer\s+/i, '')) : undefined; }
  @Post('auth/logout') async logout(@Headers('authorization') authorization?: string) { return this.authService ? await this.authService.logout(authorization?.replace(/^Bearer\s+/i, '')) : { revoked: false }; }
  @Get('health') health() { return this.appService.health(); }
  @Get('install/status') async installStatus() { return this.installService.getStatus(); }
  @Post('install') async install(@Body() body: any) {
    try { return await this.installService.install(body); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '安装失败'); }
  }
  @Get('box-shapes') boxShapes() { return boxShapeCatalog(); }
  @Post('merchant/:slug/logo')
  @UseGuards(MerchantLogoGuard)
  @UseInterceptors(FileInterceptor('logo', { limits: { fileSize: LOGO_MAX_BYTES, files: 1, fields: 0, parts: 2 } }))
  async uploadLogo(@Param('slug') slug: string, @UploadedFile() file?: LogoFile) {
    return this.appService.uploadLogo(slug, file);
  }
  @Post('merchant/:slug/assets')
  @UseGuards(MerchantLogoGuard)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: ASSET_MAX_BYTES, files: 1, fields: 0, parts: 2 } }))
  async uploadAsset(@Param('slug') slug: string, @UploadedFile() file?: LogoFile) {
    return this.appService.uploadAsset(slug, file);
  }
  @Get('admin/merchants') async merchants(@Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('商家列表需要登录');
    if (identity.role !== 'super_admin') throw new ForbiddenException('仅超级管理员可查看全部商家');
    return this.appService.listMerchants();
  }
  @Post('admin/merchants') async createMerchant(@Body() body: { name: string; slug: string; slogan?: string; brandSubtitle?: string; logoUrl?: string; username: string; password: string }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('创建商家需要登录');
    if (identity.role !== 'super_admin') throw new ForbiddenException('仅超级管理员可创建商家');
    try {
      const salt = randomBytes(16).toString('hex');
      const passwordHash = salt + '$' + scryptSync(body.password, salt, 64).toString('hex');
      return await this.appService.createMerchant({ name: body.name, slug: body.slug, slogan: body.slogan, brandSubtitle: body.brandSubtitle, logoUrl: body.logoUrl, username: body.username, passwordHash });
    } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '商家参数无效'); }
  }
  @Delete('admin/merchants/:id') async deleteMerchant(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('删除商户需要登录');
    if (identity.role !== 'super_admin') throw new ForbiddenException('仅超级管理员可删除商户');
    try { return await this.appService.deleteMerchant(id); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '删除商户失败'); }
  }
  @Patch('admin/merchants/:id/status') async updateMerchantStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'disabled' }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('修改商家状态需要登录');
    if (identity.role !== 'super_admin') throw new ForbiddenException('仅超级管理员可修改商家状态');
    try { return await this.appService.updateMerchantStatus(id, body.status); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '商家状态无效'); }
  }
  @Get('merchant/:slug/options') async options(@Param('slug') slug: string, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('选项管理需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能管理当前商家的选项');
    return this.appService.listOptions(slug);
  }
  @Post('merchant/:slug/options') async createOption(@Param('slug') slug: string, @Body() body: { category: string; name: string; payload?: Record<string, unknown>; sortOrder?: number }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('创建选项需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能管理当前商家的选项');
    try { return await this.appService.createOption(slug, body); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '选项参数无效'); }
  }
  @Patch('merchant/:slug/options/:id') async updateOption(@Param('slug') slug: string, @Param('id') id: string, @Body() body: { category?: string; name?: string; status?: 'active' | 'disabled'; payload?: Record<string, unknown>; sortOrder?: number }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('修改选项需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能管理当前商家的选项');
    try { return await this.appService.updateOption(slug, id, body); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '选项参数无效'); }
  }
  @Get('merchant/:slug/products') async products(@Param('slug') slug: string, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('产品管理需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能管理当前商家的产品');
    return this.appService.listProducts(slug);
  }
  @Post('merchant/:slug/products') async createProduct(@Param('slug') slug: string, @Body() body: { name: string; payload?: Record<string, unknown> }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('创建产品需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能管理当前商家的产品');
    try { return await this.appService.createProduct(slug, { name: body.name, payload: body.payload ?? {} }); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '产品参数无效'); }
  }
  @Patch('merchant/:slug/products/:id') async updateProduct(@Param('slug') slug: string, @Param('id') id: string, @Body() body: { name?: string; status?: 'active' | 'disabled'; payload?: Record<string, unknown> }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('修改产品需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能管理当前商家的产品');
    try { return await this.appService.updateProduct(slug, id, body); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '产品参数无效'); }
  }
  @Get('storefront/:slug/config') async config(@Param('slug') slug: string) { return this.appService.getConfig(slug); }
  @Get('merchant/:slug/config') async adminConfig(@Param('slug') slug: string, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('配置读取需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能读取当前商家的配置');
    return this.appService.getAdminConfig(slug);
  }
  @Patch('merchant/:slug/config') async update(@Param('slug') slug: string, @Body() body: any, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('配置修改需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能修改当前商家的配置');
    try { return await this.appService.updateConfig(slug, body); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '配置参数无效'); }
  }
  @Get('storefront/:slug/cart') async cart(@Param('slug') slug: string, @Headers('x-cart-session') sessionKey?: string) {
    try { return await this.appService.getCart(slug, sessionKey ?? ''); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '购物车参数无效'); }
  }
  @Put('storefront/:slug/cart') async saveCart(@Param('slug') slug: string, @Headers('x-cart-session') sessionKey: string, @Body() body: { items: unknown[] }) {
    try { return await this.appService.saveCart(slug, sessionKey, body.items); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '购物车参数无效'); }
  }
  @Post('storefront/:slug/orders') async createOrder(@Param('slug') slug: string, @Body() body: any) {
    try { return await this.appService.createOrder(slug, body); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '订单参数无效'); }
  }
  @Get('merchant/:slug/orders') async orders(@Param('slug') slug: string, @Query('status') status?: string, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('订单管理需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能查看当前商家的订单');
    try { return await this.appService.listOrders(slug, status); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '订单状态无效'); }
  }
  @Patch('merchant/:slug/orders/:id/status') async orderStatus(@Param('slug') slug: string, @Param('id') id: string, @Body() body: { status: string }, @Headers('authorization') authorization?: string) {
    const identity = await this.identity(authorization);
    if (!identity) throw new UnauthorizedException('订单管理需要登录');
    if (identity.role !== 'super_admin' && identity.merchantSlug !== slug) throw new ForbiddenException('只能修改当前商家的订单');
    try { return await this.appService.updateOrderStatus(slug, id, body.status); } catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '订单状态无效'); }
  }
  @Post('storefront/:slug/quotes') async quote(@Param('slug') slug: string, @Body() body: any) {
    try { return await this.appService.quote(slug, body); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : '报价参数无效'); }
  }
}