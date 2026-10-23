import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProjectsUseCases } from './application/projects.use-cases';

@Controller('projetos')
export class ProjectsController {
  constructor(private readonly projects: ProjectsUseCases) {}

  @Get()
  findAll() {
    return this.projects.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projects.findOne(id);
  }
}
