import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';
import { InstallService } from './install.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DatabaseService, AuthService, InstallService],
})
export class AppModule {}