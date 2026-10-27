import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUrl, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Seniority } from '@prisma/client';
export class ExperienceDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 120) company!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 120) title!: string;
  @IsISO8601({ strict: true }) startsAt!: string;
  @IsOptional() @IsISO8601({ strict: true }) endsAt?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
}
export class EducationDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 120) institution!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(1, 160) course!: string;
  @IsISO8601({ strict: true }) startsAt!: string;
  @IsOptional() @IsISO8601({ strict: true }) endsAt?: string | null;
}
export class ProfileDto {
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 120) name!: string;
  @IsOptional() @IsString() @Matches(/^[+()\d\s.-]{8,30}$/) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(120) location?: string | null;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) linkedIn?: string | null;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(500) portfolio?: string | null;
  @IsOptional() @IsEnum(Seniority) seniority?: Seniority | null;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000) salaryCents?: number | null;
  @IsOptional() @IsString() @MaxLength(5000) summary?: string | null;
  @IsBoolean() talentConsent!: boolean;
  @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Length(1, 60, { each: true }) skills: string[] = [];
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => ExperienceDto) experiences: ExperienceDto[] = [];
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => EducationDto) education: EducationDto[] = [];
}
export class DeleteProfileDto {
  @IsString() @Length(12, 128) password!: string;
}
