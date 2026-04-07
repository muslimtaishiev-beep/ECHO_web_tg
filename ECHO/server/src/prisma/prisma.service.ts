import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Connect to DB in background to avoid blocking server startup
    this.$connect()
      .then(() => console.log('🗄️ Database connected successfully'))
      .catch((err) => console.error('❌ Database connection failed:', err));
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
