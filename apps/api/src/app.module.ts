import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ENV, readEnvironment } from './config';
import { PrismaService } from './prisma.service';
import { AdminController, AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthenticationGuard, OriginGuard, RolesGuard } from './auth/auth.guards';
import { Public } from './auth/auth.decorators';
import { CandidatesController } from './candidates/candidates.controller';
import { CandidatesService } from './candidates/candidates.service';
import { PublicJobsController, RecruitmentJobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';
import { ResumesController } from './files/resumes.controller';
import { ResumesService } from './files/resumes.service';
import { LocalPrivateStorage, PrivateStorage } from './files/private-storage';
@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Public() @Get('live') live() { return { status: 'ok' }; }
  @Public() @Get('ready') async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ready' }; }
    catch { throw new ServiceUnavailableException('Banco de dados indisponível'); }
  }
}
@Module({
  imports: [JwtModule.register({}), ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [AuthController, AdminController, HealthController, CandidatesController, PublicJobsController, RecruitmentJobsController, ResumesController],
  providers: [
    { provide: ENV, useFactory: () => readEnvironment() }, PrismaService, AuthService,
    CandidatesService, JobsService, ResumesService, { provide: PrivateStorage, useClass: LocalPrivateStorage },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
