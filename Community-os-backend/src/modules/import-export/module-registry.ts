import { Injectable } from '@nestjs/common';
import {
  ModuleConfig,
  ModuleImportConfig,
  ModuleExportConfig,
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

  list(): string[] {
    return Array.from(this.modules.keys());
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
