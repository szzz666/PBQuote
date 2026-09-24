import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database.service';
import { AuthService } from './auth.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, DatabaseService, AuthService],
})
export class AppModule {}