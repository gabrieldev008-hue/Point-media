import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Put, Body, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { CurrentUser } from '@pointmedia/shared';
import { Actor, Roles } from '../auth/auth.decorators';
import { CandidatesService } from './candidates.service';
import { DeleteProfileDto, ProfileDto } from './profile.dto';
import { PaginationDto } from '../common/pagination.dto';
@ApiTags('candidates') @ApiCookieAuth('pm_session') @Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}
  @Roles('CANDIDATE') @Get('me') own(@Actor() user: CurrentUser) { return this.candidates.own(user.id); }
  @Roles('CANDIDATE') @Put('me') update(@Actor() user: CurrentUser, @Body() dto: ProfileDto) { return this.candidates.update(user.id, dto); }
  @Roles('CANDIDATE') @Delete('me') @HttpCode(204)
  remove(@Actor() user: CurrentUser, @Body() dto: DeleteProfileDto) { return this.candidates.remove(user.id, dto.password); }
  @Roles('RECRUITER', 'ADMIN') @Get() list(@Query() query: PaginationDto) { return this.candidates.list(query); }
  @Roles('RECRUITER', 'ADMIN') @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: CurrentUser) { return this.candidates.detail(id, actor.id); }
}
