import { ModuleRegistry } from '../module-registry';
import { householdsImportConfig } from './households.adapter';
import { residentsImportConfig } from './residents.adapter';
import { vehiclesImportConfig } from './vehicles.adapter';
import { petsImportConfig } from './pets.adapter';
import { staffImportConfig } from './staff.adapter';

export function registerAllAdapters(registry: ModuleRegistry) {
  registry.register(householdsImportConfig);
  registry.register(residentsImportConfig);
  registry.register(vehiclesImportConfig);
  registry.register(petsImportConfig);
  registry.register(staffImportConfig);
}
