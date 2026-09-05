import { Injectable } from '@nestjs/common';
import {
  ModuleConfig,
  ModuleImportConfig,
  ModuleExportConfig,
  ModuleInfo,
  ModuleSchema,
} from './import-export.types';

@Injectable()
export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleConfig>();

  register(config: ModuleConfig) {
    this.modules.set(config.module, config);
  }

  get(module: string): ModuleConfig | undefined {
    return this.modules.get(module);
  }

  getImportConfig(module: string): ModuleImportConfig | undefined {
    return this.modules.get(module)?.import;
  }

  getExportConfig(module: string): ModuleExportConfig | undefined {
    return this.modules.get(module)?.export;
  }

  list(): ModuleInfo[] {
    return Array.from(this.modules.values()).map((config) => ({
      module: config.module,
      entityLabel: config.entityLabel ?? config.module,
      hasImport: Boolean(config.import),
      hasExport: Boolean(config.export),
    }));
  }

  getSchema(module: string): ModuleSchema | undefined {
    const config = this.modules.get(module);
    if (!config) return undefined;
    return {
      module: config.module,
      entityLabel: config.entityLabel ?? config.module,
      templateFields: config.import?.templateFields ?? [],
      exportColumns: config.export?.columns ?? [],
    };
  }

  hasImport(module: string): boolean {
    return Boolean(this.modules.get(module)?.import);
  }

  hasExport(module: string): boolean {
    return Boolean(this.modules.get(module)?.export);
  }

  getImportPermission(module: string): string | undefined {
    return this.modules.get(module)?.importPermission;
  }

  getExportPermission(module: string): string | undefined {
    return this.modules.get(module)?.exportPermission;
  }
}
