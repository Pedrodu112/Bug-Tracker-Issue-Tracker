import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { IssuesModule } from '../issues/issues.module';
import { ProjectsModule } from '../projects/projects.module';
import { AppController } from './app.controller';

@Module({ imports: [PrismaModule, IssuesModule, ProjectsModule], controllers: [AppController] })
export class AppModule {}
