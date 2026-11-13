import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ISSUE_ACTIONS, ISSUE_ROLES, IssueAction, IssueRole } from '../domain/issue-transition';

export class IssueTransitionDto {
  @IsIn(ISSUE_ACTIONS)
  action!: IssueAction;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'O identificador do autor não pode ficar vazio.' })
  @MaxLength(100)
  actorId!: string;

  @IsIn(ISSUE_ROLES)
  actorRole!: IssueRole;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;
}
