import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('🟢 [DATABASE] Successfully connected to PostgreSQL.');
    } catch (err) {
      console.error('❌ [DATABASE] Failed to connect to PostgreSQL!');
      console.error(`Reason: ${err.message || err}`);
      console.error('Check your DATABASE_URL in .env');
      // We don't exit the process here to allow the server to at least start
      // so the user can see the error in the logs.
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
