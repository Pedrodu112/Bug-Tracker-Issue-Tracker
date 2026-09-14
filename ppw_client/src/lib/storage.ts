import { Issue, Project } from '@/types/issue';
const ISSUES_KEY = 'bug-tracker-issues'; const PROJECTS_KEY = 'bug-tracker-projetos';
function load<T>(key: string): T[] | null { if (typeof window === 'undefined') return null; const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T[] : null; }
function save<T>(key: string, data: T[]) { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(data)); }
export const loadIssues = () => load<Issue>(ISSUES_KEY); export const saveIssues = (issues: Issue[]) => save(ISSUES_KEY, issues); export const loadProjects = () => load<Project>(PROJECTS_KEY); export const saveProjects = (projects: Project[]) => save(PROJECTS_KEY, projects);
