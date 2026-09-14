import { Injectable, NotFoundException } from '@nestjs/common';
import { Project } from './project.interface';
@Injectable()
export class ProjectsService {
  private readonly projects: Project[] = [{ id: 1, name: 'Sistema Web', description: 'Portal principal para clientes.' }, { id: 2, name: 'Aplicativo Mobile', description: 'Aplicativo para dispositivos móveis.' }, { id: 3, name: 'Portal Acadêmico', description: 'Serviços digitais para estudantes.' }];
  findAll() { return this.projects; }
  findOne(id: number) { const project = this.projects.find((item) => item.id === id); if (!project) throw new NotFoundException('Projeto não encontrado.'); return project; }
}
