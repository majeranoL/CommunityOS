import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { CreateDocumentDto } from './create-document.dto';

import { DocumentStatus } from '@prisma/client';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;
}
