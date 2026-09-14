import { Module } from '@nestjs/common';
import { IssuesModule } from '../issues/issues.module';
import { ProjectsModule } from '../projects/projects.module';
import { AppController } from './app.controller';

@Module({ imports: [IssuesModule, ProjectsModule], controllers: [AppController] })
export class AppModule {}
