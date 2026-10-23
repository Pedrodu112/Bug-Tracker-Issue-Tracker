import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { IssuesController } from './issues.controller';
import { IssuesUseCases } from './application/issues.use-cases';
import { ISSUES_REPOSITORY } from './application/ports/issues.repository';
import { InMemoryIssuesRepository } from './infrastructure/in-memory-issues.repository';

@Module({
  imports: [ProjectsModule],
  controllers: [IssuesController],
  providers: [
    IssuesUseCases,
    { provide: ISSUES_REPOSITORY, useClass: InMemoryIssuesRepository },
  ],
})
export class IssuesModule {}
