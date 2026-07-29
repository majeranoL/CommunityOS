import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()

  @IsUUID('4', {
    each: true,
  })
  permissionIds!: string[];
}