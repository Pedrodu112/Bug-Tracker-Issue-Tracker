import { Injectable } from '@nestjs/common';
import { Project } from '../domain/project';
import { ProjectsRepository } from '../application/ports/projects.repository';

@Injectable()
export class InMemoryProjectsRepository implements ProjectsRepository {
  private readonly projects: Project[] = [
    { id: 1, name: 'Sistema Web', description: 'Portal principal para clientes.' },
    { id: 2, name: 'Aplicativo Mobile', description: 'Aplicativo para dispositivos móveis.' },
    { id: 3, name: 'Portal Acadêmico', description: 'Serviços digitais para estudantes.' },
  ];

  async findAll(): Promise<Project[]> {
    return this.projects.map((project) => ({ ...project }));
  }

  async findById(id: number): Promise<Project | undefined> {
    const project = this.projects.find((item) => item.id === id);
    return project ? { ...project } : undefined;
  }
}
