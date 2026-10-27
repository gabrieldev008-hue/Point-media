import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { CurrentUser } from '@pointmedia/shared';
import { Actor, Roles } from '../auth/auth.decorators';
import { MAX_RESUME_SIZE, PDF_MIME, type ResumeUpload } from './resume-validation';
import { ResumesService } from './resumes.service';
@ApiTags('resumes') @ApiCookieAuth('pm_session') @Controller()
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}
  @Roles('CANDIDATE') @Post('candidates/me/resume')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_RESUME_SIZE, files: 1, fields: 0, parts: 1 } }))
  @ApiConsumes('multipart/form-data') @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] } })
  upload(@Actor() actor: CurrentUser, @UploadedFile() file?: ResumeUpload) { return this.resumes.upload(actor.id, file); }
  @Roles('CANDIDATE') @Delete('candidates/me/resume') @HttpCode(204)
  remove(@Actor() actor: CurrentUser) { return this.resumes.remove(actor.id); }
  @Roles('CANDIDATE', 'RECRUITER', 'ADMIN') @Get('resumes/:id')
  async download(@Param('id', ParseUUIDPipe) id: string, @Actor() actor: CurrentUser, @Res() response: Response) {
    const { bytes, mimeType } = await this.resumes.download(id, actor);
    response.set({ 'Content-Type': mimeType, 'Content-Disposition': `attachment; filename="curriculo.${mimeType === PDF_MIME ? 'pdf' : 'docx'}"`,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.send(bytes);
  }
}
