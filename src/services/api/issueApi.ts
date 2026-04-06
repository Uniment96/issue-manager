import { apiClient } from './client';
import { CreateIssuePayload, Issue, IssueStatus } from '../../types';

export async function apiCreateIssue(payload: CreateIssuePayload): Promise<Issue> {
  const { data } = await apiClient.post<Issue>('/api/issues', payload);
  return data;
}

export async function apiUpdateIssue(id: string, status: IssueStatus): Promise<Issue> {
  const { data } = await apiClient.patch<Issue>(`/api/issues/${id}`, { status });
  return data;
}

export async function apiFetchIssues(): Promise<Issue[]> {
  const { data } = await apiClient.get<Issue[]>('/api/issues');
  return data;
}
