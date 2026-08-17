import { Module, Global, OnModuleInit } from '@nestjs/common';
import { ImportExportService } from './import-export.service';
import { ImportExportController } from './import-export.controller';
import { ModuleRegistry } from './module-registry';
import { PrismaModule } from '../../prisma/prisma.module';
import { registerAllAdapters } from './adapters';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [ImportExportController],
  providers: [ModuleRegistry, ImportExportService],
  exports: [ModuleRegistry, ImportExportService],
})
export class ImportExportModule implements OnModuleInit {
  constructor(private readonly registry: ModuleRegistry) {}

  onModuleInit() {
    registerAllAdapters(this.registry);
  }
}
