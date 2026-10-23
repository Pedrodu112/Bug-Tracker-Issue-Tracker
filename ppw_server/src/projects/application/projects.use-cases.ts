import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Project } from '../domain/project';
import { PROJECTS_REPOSITORY, ProjectsRepository } from './ports/projects.repository';

@Injectable()
export class ProjectsUseCases {
  constructor(
    @Inject(PROJECTS_REPOSITORY)
    private readonly repository: ProjectsRepository,
  ) {}

  findAll(): Promise<Project[]> {
    return this.repository.findAll();
  }

  async findOne(id: number): Promise<Project> {
    const project = await this.repository.findById(id);
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }
}
