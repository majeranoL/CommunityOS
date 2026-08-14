import { PartialType } from '@nestjs/mapped-types';

import { CreateChargeTypeDto } from './charge-type.dto';

export class UpdateChargeTypeDto extends PartialType(CreateChargeTypeDto) {}
