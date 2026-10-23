import { Issue, Project } from '@/types/issue';

const ISSUES_KEY = 'bug-tracker-issues';
const PROJECTS_KEY = 'bug-tracker-projetos';

function load<T>(key: string): T[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;

    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    // Cache corrompido ou bloqueado não deve derrubar a aplicação.
    return null;
  }
}

function save<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // O cache é opcional; a API permanece como fonte principal dos dados.
  }
}

export const loadIssues = () => load<Issue>(ISSUES_KEY);
export const saveIssues = (issues: Issue[]) => save(ISSUES_KEY, issues);
export const loadProjects = () => load<Project>(PROJECTS_KEY);
export const saveProjects = (projects: Project[]) => save(PROJECTS_KEY, projects);
