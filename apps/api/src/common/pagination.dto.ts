import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
export class PaginationDto {
  @Type(() => Number) @IsInt() @Min(1)
  page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50)
  pageSize = 12;
  @IsOptional() @IsString() @MaxLength(120)
  search?: string;
}
