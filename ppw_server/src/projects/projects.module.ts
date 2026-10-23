import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsUseCases } from './application/projects.use-cases';
import { PROJECTS_REPOSITORY } from './application/ports/projects.repository';
import { InMemoryProjectsRepository } from './infrastructure/in-memory-projects.repository';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsUseCases,
    { provide: PROJECTS_REPOSITORY, useClass: InMemoryProjectsRepository },
  ],
})
export class ProjectsModule {}
