import { Injectable } from '@nestjs/common';
import type { Project as PrismaProjectRecord } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Project } from '../domain/project';
import { ProjectsRepository } from '../application/ports/projects.repository';

@Injectable()
export class PrismaProjectsRepository implements ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Project[]> {
    const records = await this.prisma.project.findMany({ orderBy: { id: 'asc' } });
    return records.map((record) => this.toDomain(record));
  }

  async findById(id: number): Promise<Project | undefined> {
    const record = await this.prisma.project.findUnique({ where: { id } });
    return record ? this.toDomain(record) : undefined;
  }

  private toDomain(record: PrismaProjectRecord): Project {
    return { id: record.id, name: record.name, description: record.description };
  }
}
