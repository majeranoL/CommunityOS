import { PartialType } from '@nestjs/mapped-types';
import { CreateUtilityExpenseDto } from './create-utility-expense.dto';

export class UpdateUtilityExpenseDto extends PartialType(CreateUtilityExpenseDto) {}
