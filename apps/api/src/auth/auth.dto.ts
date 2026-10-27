import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { normalizeEmail } from '@pointmedia/shared';
export class LoginDto {
  @ApiProperty({ example: 'talento@example.test' })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? normalizeEmail(value) : value)
  @IsEmail() @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password' })
  @IsString() @Length(12, 128)
  password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @Length(2, 120)
  name!: string;

  @ApiProperty({ description: 'Consentimento opcional para futuras oportunidades' })
  @IsBoolean()
  talentConsent!: boolean;
}
