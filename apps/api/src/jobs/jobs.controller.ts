import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { CurrentUser } from '@pointmedia/shared';
import { Actor, Public, Roles } from '../auth/auth.decorators';
import { JobDto, JobQueryDto, JobStatusDto, UpdateJobDto } from './jobs.dto';
import { JobsService } from './jobs.service';
@ApiTags('jobs') @Controller('jobs')
export class PublicJobsController {
  constructor(private readonly jobs: JobsService) {}
  @Public() @Get() list(@Query() query: JobQueryDto) { return this.jobs.list(query, false); }
  @Public() @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.jobs.detail(id, false); }
}
@ApiTags('recruitment/jobs') @ApiCookieAuth('pm_session') @Roles('RECRUITER', 'ADMIN') @Controller('recruitment/jobs')
export class RecruitmentJobsController {
  constructor(private readonly jobs: JobsService) {}
  @Get() list(@Query() query: JobQueryDto) { return this.jobs.list(query, true); }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.jobs.detail(id, true); }
  @Post() create(@Body() dto: JobDto, @Actor() actor: CurrentUser) { return this.jobs.create(dto, actor.id); }
  @Put(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateJobDto, @Actor() actor: CurrentUser) { return this.jobs.update(id, dto, actor.id); }
  @Patch(':id/status') status(@Param('id', ParseUUIDPipe) id: string, @Body() dto: JobStatusDto, @Actor() actor: CurrentUser) { return this.jobs.status(id, dto, actor.id); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: CurrentUser) { return this.jobs.remove(id, actor.id); }
}
