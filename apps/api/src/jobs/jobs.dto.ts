import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { JobStatus, Seniority } from '@prisma/client';
import { PaginationDto } from '../common/pagination.dto';
export class JobDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(3, 150) title!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(20, 15000) description!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 100) department!: string;
  @IsEnum(Seniority) seniority!: Seniority;
  @IsIn(['REMOTE', 'HYBRID', 'ONSITE']) workMode!: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000) salaryMinCents?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000) salaryMaxCents?: number | null;
  @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) opensAt!: string;
  @IsISO8601({ strict: true }) @Matches(/(Z|[+-]\d{2}:\d{2})$/) closesAt!: string;
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Length(1, 60, { each: true }) requiredSkills: string[] = [];
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Length(1, 60, { each: true }) desiredSkills: string[] = [];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @Length(1, 500, { each: true }) essentials: string[] = [];
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @Length(1, 500, { each: true }) desirables: string[] = [];
  @IsInt() @Min(0) @Max(100) technologyWeight = 50;
  @IsInt() @Min(0) @Max(100) seniorityWeight = 30;
  @IsInt() @Min(0) @Max(100) salaryWeight = 20;
}
export class UpdateJobDto extends JobDto {
  @IsInt() @Min(1) revision!: number;
}
export class JobStatusDto {
  @IsEnum(JobStatus) status!: JobStatus;
  @IsInt() @Min(1) revision!: number;
}
export class JobQueryDto extends PaginationDto {
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
}
