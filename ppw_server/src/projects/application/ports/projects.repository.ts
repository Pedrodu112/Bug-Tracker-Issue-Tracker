import { Project } from '../../domain/project';

export const PROJECTS_REPOSITORY = Symbol('PROJECTS_REPOSITORY');

export interface ProjectsRepository {
  findAll(): Promise<Project[]>;
  findById(id: number): Promise<Project | undefined>;
}
