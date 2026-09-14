import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
@Controller('projetos')
export class ProjectsController { constructor(private readonly projectsService: ProjectsService) {} @Get() findAll() { return this.projectsService.findAll(); } @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.projectsService.findOne(id); } }
